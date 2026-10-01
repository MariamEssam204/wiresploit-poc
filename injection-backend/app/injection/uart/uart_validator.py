"""
PC-side UART validation.

Same allow-listed config rules as the node's validator (kept in sync
deliberately, not shared by import, since the PC and Pi are separate
deployable projects). The one PC-side difference: the physical
interface existence check is deferred to the node, since the PC has
no visibility into the Pi's serial hardware - the node re-validates
that independently before ever opening a port.
"""

from __future__ import annotations

import re
from typing import Optional

from app.injection import node_registry
from app.models.uart_action import UARTAction, UARTPayload

ALLOWED_BAUD_RATES = {9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600}
ALLOWED_DATA_BITS = {5, 6, 7, 8}
ALLOWED_PARITY = {"none", "even", "odd", "mark", "space"}
ALLOWED_STOP_BITS = {1, 1.5, 2}
ALLOWED_FLOW_CONTROL = {"none", "rts_cts", "xon_xoff"}

MAX_PAYLOAD_BYTES = 4096
HEX_RE = re.compile(r"^[0-9a-fA-F]+$")


def validate_baud_rate(baud_rate: int, errors: list[str]) -> None:
    if baud_rate not in ALLOWED_BAUD_RATES:
        errors.append(f"Baud rate {baud_rate} is not supported. Allowed: {sorted(ALLOWED_BAUD_RATES)}")


def validate_data_bits(data_bits: int, errors: list[str]) -> None:
    if data_bits not in ALLOWED_DATA_BITS:
        errors.append(f"Data bits must be one of {sorted(ALLOWED_DATA_BITS)}.")


def validate_parity(parity: str, errors: list[str]) -> None:
    if parity not in ALLOWED_PARITY:
        errors.append(f"Parity must be one of {sorted(ALLOWED_PARITY)}.")


def validate_stop_bits(stop_bits, errors: list[str]) -> None:
    if stop_bits not in ALLOWED_STOP_BITS:
        errors.append(f"Stop bits must be one of {sorted(ALLOWED_STOP_BITS)}.")


def validate_flow_control(flow_control: str, errors: list[str]) -> None:
    if flow_control not in ALLOWED_FLOW_CONTROL:
        errors.append(f"Flow control must be one of {sorted(ALLOWED_FLOW_CONTROL)}.")


def validate_timeout(timeout: float, errors: list[str]) -> None:
    if not (0.1 <= timeout <= 30.0):
        errors.append("Timeout must be between 0.1 and 30 seconds.")


def payload_to_bytes(payload: UARTPayload, errors: list[str]) -> Optional[bytes]:
    if payload.format == "text":
        try:
            data = payload.value.encode("utf-8")
        except Exception:
            errors.append("Payload text could not be encoded as UTF-8.")
            return None
    elif payload.format == "hex":
        cleaned = payload.value.replace(" ", "").replace("\n", "")
        if not cleaned:
            errors.append("Hex payload is empty.")
            return None
        if not HEX_RE.match(cleaned):
            errors.append("Hex payload contains invalid characters.")
            return None
        if len(cleaned) % 2 != 0:
            errors.append("Hex payload does not represent complete bytes.")
            return None
        try:
            data = bytes.fromhex(cleaned)
        except ValueError:
            errors.append("Hex payload could not be parsed.")
            return None
    else:
        errors.append(f"Unknown payload format '{payload.format}'.")
        return None

    if len(data) > MAX_PAYLOAD_BYTES:
        errors.append(f"Payload exceeds the {MAX_PAYLOAD_BYTES} byte limit for this prototype.")

    return data


def validate_action(action: UARTAction) -> tuple[bool, list[str], Optional[bytes]]:
    errors: list[str] = []

    # UART injection always requires a configured Raspberry Pi node -
    # there is no PC-local UART execution path in this architecture.
    if node_registry.get_node() is None:
        errors.append(
            "No Injection Node is configured. UART injection requires a "
            "configured Raspberry Pi node - configure one before executing."
        )

    if not action.interface:
        errors.append("Interface is required.")

    validate_baud_rate(action.configuration.baud_rate, errors)
    validate_data_bits(action.configuration.data_bits, errors)
    validate_parity(action.configuration.parity, errors)
    validate_stop_bits(action.configuration.stop_bits, errors)
    validate_flow_control(action.configuration.flow_control, errors)
    validate_timeout(action.timeout, errors)

    payload_bytes = payload_to_bytes(action.payload, errors)

    return (len(errors) == 0), errors, payload_bytes
