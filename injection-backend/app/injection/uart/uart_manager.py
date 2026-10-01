"""
UART injection orchestration on the PC.

Mirrors app.injection.manager (network) in shape: validate, forward
to the configured node, and record the result. UART has no PC-local
execution path - it always requires a node.
"""

from __future__ import annotations

import itertools
import threading
from datetime import datetime, timezone

from app.audit.logger import append_entry
from app.injection.executors.remote_pi_executor import RemotePiExecutor
from app.injection import timeline_forwarder
from app.injection.uart.uart_validator import validate_action
from app.models.uart_action import UARTAction, UARTExecutionResult, UARTValidationResult

_id_lock = threading.Lock()
_id_counter = itertools.count(1)

_history: list[UARTExecutionResult] = []


def _new_action_id() -> str:
    with _id_lock:
        n = next(_id_counter)
    return f"UART-{n:06d}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate(action: UARTAction) -> UARTValidationResult:
    action_id = action.action_id or _new_action_id()
    is_valid, errors, _ = validate_action(action)
    return UARTValidationResult(
        valid=is_valid,
        action_id=action_id,
        errors=errors,
        message="Action is valid." if is_valid else "Action failed validation.",
    )


def _summarize(action: UARTAction, payload_bytes) -> str:
    length = len(payload_bytes) if payload_bytes else 0
    mode = "exact-match loopback" if action.compare_response else "response capture"
    cfg = action.configuration
    return (
        f"UART {cfg.baud_rate}bps {cfg.data_bits}{cfg.parity[:1].upper()}{cfg.stop_bits} "
        f"-> {action.interface}, {length} bytes ({mode})"
    )


def execute(action: UARTAction) -> UARTExecutionResult:
    action_id = action.action_id or _new_action_id()
    started_at = _now_iso()

    is_valid, errors, payload_bytes = validate_action(action)

    if not is_valid:
        result = UARTExecutionResult(
            action_id=action_id,
            status="validation_error",
            interface=action.interface,
            configuration=action.configuration,
            started_at=started_at,
            completed_at=_now_iso(),
            message="Validation failed.",
            error="; ".join(errors),
        )
        _record(result)
        return result

    packet_summary = _summarize(action, payload_bytes)

    executor = RemotePiExecutor()
    outcome = executor.execute_uart_action(action, payload_bytes)
    # Store the node's ES-ready event as a packet + live-push it to the timeline.
    timeline_forwarder.forward_event(outcome.get("event"))

    completed_at = _now_iso()
    status = outcome.get("status") or ("success" if outcome.get("success") else "execution_error")
    result = UARTExecutionResult(
        action_id=action_id,
        status=status,
        interface=action.interface,
        configuration=action.configuration,
        started_at=started_at,
        completed_at=completed_at,
        duration_ms=outcome.get("duration_ms"),
        message="UART test completed successfully." if outcome.get("success") else "UART test failed.",
        error=outcome.get("error"),
        transmitted_bytes=outcome.get("transmitted_bytes"),
        received_bytes=outcome.get("received_bytes"),
        received_hex=outcome.get("received_hex"),
        match=outcome.get("match"),
        packet_summary=outcome.get("packet_summary") or packet_summary,
        node_id=outcome.get("node_id"),
        node_type=outcome.get("node_type"),
    )
    _record(result)
    return result


def _record(result: UARTExecutionResult) -> None:
    _history.append(result)
    append_entry(
        {
            "action_id": result.action_id,
            "timestamp": result.started_at,
            "domain": "uart_injection",
            "node_id": result.node_id,
            "node_type": result.node_type,
            "interface": result.interface,
            "baud_rate": result.configuration.baud_rate,
            "status": result.status,
            "duration_ms": result.duration_ms,
            "transmitted_bytes": result.transmitted_bytes,
            "received_bytes": result.received_bytes,
            "match": result.match,
            "error": result.error,
            # Deliberately NOT logging received_hex / payload contents here -
            # see docs/SAFETY.md on avoiding unnecessary payload exposure in logs.
        }
    )


def list_history() -> list[UARTExecutionResult]:
    return list(reversed(_history))


def get_action(action_id: str) -> UARTExecutionResult | None:
    for r in _history:
        if r.action_id == action_id:
            return r
    return None
