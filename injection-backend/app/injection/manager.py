"""
NetworkInjectionManager - the single orchestration point between
validated actions and protocol-specific test builders.

API routes must never talk to the builders or Scapy directly;
everything goes through here so the "WHAT vs HOW" separation holds.
"""

from __future__ import annotations

import itertools
import threading
from datetime import datetime, timezone

from app.audit.logger import append_entry
from app.injection import node_registry, timeline_forwarder
from app.injection.builders import icmp_builder, tcp_builder, udp_builder
from app.injection.executors.local_executor import LocalPCExecutor
from app.injection.executors.remote_pi_executor import RemotePiExecutor
from app.injection.validators import validate_action
from app.models.network_action import ExecutionResult, NetworkAction, ValidationResult

_id_lock = threading.Lock()
_id_counter = itertools.count(1)

# In-memory store of recent actions/results (v0 - no database).
_history: list[ExecutionResult] = []


def _new_action_id() -> str:
    with _id_lock:
        n = next(_id_counter)
    return f"NET-{n:06d}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate(action: NetworkAction) -> ValidationResult:
    action_id = action.action_id or _new_action_id()
    is_valid, errors, _ = validate_action(action)
    return ValidationResult(
        valid=is_valid,
        action_id=action_id,
        errors=errors,
        message="Action is valid." if is_valid else "Action failed validation.",
    )


def _summarize(action: NetworkAction, payload_bytes) -> str:
    if action.protocol == "ICMP":
        plan = icmp_builder.IcmpTestPlan(
            target_address=action.target.address,
            payload=payload_bytes or b"",
            timeout=action.timeout,
        )
        return icmp_builder.summarize(plan)
    if action.protocol == "TCP":
        plan = tcp_builder.TcpTestPlan(
            target_address=action.target.address,
            target_port=action.target.port,
            test_type=action.test_type,
            payload=payload_bytes,
            timeout=action.timeout,
        )
        return tcp_builder.summarize(plan)
    plan = udp_builder.UdpTestPlan(
        target_address=action.target.address,
        target_port=action.target.port,
        payload=payload_bytes or b"",
        timeout=action.timeout,
    )
    return udp_builder.summarize(plan)


def execute(action: NetworkAction) -> ExecutionResult:
    """
    Re-validates (never trust a prior validation call alone), then
    performs the real controlled test and always records an audit entry.
    """
    action_id = action.action_id or _new_action_id()
    started_at = _now_iso()

    is_valid, errors, payload_bytes = validate_action(action)

    if not is_valid:
        result = ExecutionResult(
            action_id=action_id,
            status="invalid",
            protocol=action.protocol,
            test_type=action.test_type,
            interface=action.interface,
            target=action.target,
            started_at=started_at,
            completed_at=_now_iso(),
            message="Validation failed.",
            error="; ".join(errors),
        )
        _record(result)
        return result

    packet_summary = _summarize(action, payload_bytes)

    node = node_registry.get_node()
    executor = RemotePiExecutor() if node is not None else LocalPCExecutor()
    outcome = executor.execute(action, payload_bytes)
    # Store the node's ES-ready event as a packet + live-push it to the timeline.
    timeline_forwarder.forward_event(outcome.get("event"))

    completed_at = _now_iso()
    result = ExecutionResult(
        action_id=action_id,
        status="success" if outcome.get("success") else "failed",
        protocol=action.protocol,
        test_type=action.test_type,
        interface=action.interface,
        target=action.target,
        started_at=started_at,
        completed_at=completed_at,
        duration_ms=outcome.get("duration_ms"),
        message="Test completed successfully." if outcome.get("success") else "Test failed.",
        error=outcome.get("error"),
        packet_summary=outcome.get("packet_summary") or packet_summary,
        node_id=outcome.get("node_id"),
        node_type=outcome.get("node_type"),
    )
    _record(result)
    return result


def _record(result: ExecutionResult) -> None:
    _history.append(result)
    append_entry(
        {
            "action_id": result.action_id,
            "timestamp": result.started_at,
            "node_id": result.node_id,
            "node_type": result.node_type,
            "protocol": result.protocol,
            "test_type": result.test_type,
            "interface": result.interface,
            "target": f"{result.target.address}:{result.target.port}" if result.target.port else result.target.address,
            "status": result.status,
            "duration_ms": result.duration_ms,
            "error": result.error,
        }
    )


def list_history() -> list[ExecutionResult]:
    return list(reversed(_history))


def get_action(action_id: str) -> ExecutionResult | None:
    for r in _history:
        if r.action_id == action_id:
            return r
    return None
