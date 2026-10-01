"""
Validation layer for Wiresploit Network Injection.

No action reaches a builder or the executor unless it passes
every check here. Validation is intentionally strict and
allow-listed rather than permissive.
"""

from __future__ import annotations

import ipaddress
import re
import socket
from typing import Optional

from app.models.network_action import NetworkAction

ALLOWED_TEST_TYPES_BY_PROTOCOL = {
    "ICMP": {"echo"},
    "TCP": {"connection", "application_data"},
    "UDP": {"datagram"},
}

HEX_PAIR_RE = re.compile(r"^[0-9a-fA-F]+$")


def _get_available_interfaces() -> list[str]:
    """Best-effort local interface name discovery."""
    try:
        import psutil  # type: ignore

        return list(psutil.net_if_addrs().keys())
    except Exception:
        pass
    try:
        return list(socket.if_nameindex_names())  # type: ignore[attr-defined]
    except Exception:
        pass
    try:
        return [name for _, name in socket.if_nameindex()]
    except Exception:
        return []


def validate_interface(interface: str, errors: list[str]) -> None:
    """
    Checks the interface against the PC's own NICs.

    Phase 2A note: when a remote Injection Node is configured, the
    interface the analyst picks belongs to the *node's* network
    namespace, not the PC's - so this PC-local check is skipped in
    that case (see validate_action). The node re-validates its own
    interface list independently before executing anything.
    """
    available = _get_available_interfaces()
    if available and interface not in available:
        errors.append(
            f"Interface '{interface}' was not found on this system. "
            f"Available: {', '.join(available)}"
        )


def validate_target_address(address: str, errors: list[str]) -> None:
    """
    Targets are restricted to loopback and private/LAN address ranges
    (RFC 1918, link-local) - not an open target field, but wide enough
    to reach a DUT (e.g. an ESP32) sitting on the same local network
    as the Injection Node. Public/internet addresses are rejected.
    """
    if address == "localhost":
        return
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        errors.append(
            f"Target address '{address}' is not a valid IP address. "
            "Use a literal IP (e.g. 192.168.1.50) or 'localhost'."
        )
        return

    if not (ip.is_loopback or ip.is_private or ip.is_link_local):
        errors.append(
            f"Target address '{address}' is outside the allowed range. "
            "Only loopback and private/LAN addresses (e.g. 192.168.x.x, "
            "10.x.x.x, 172.16-31.x.x) are permitted - this tool is not "
            "meant to reach public/internet hosts."
        )


def validate_port(port: Optional[int], required: bool, errors: list[str]) -> None:
    if port is None:
        if required:
            errors.append("A target port is required for this test type.")
        return
    if not (1 <= port <= 65535):
        errors.append("Target port must be between 1 and 65535.")


def validate_timeout(timeout: float, errors: list[str]) -> None:
    if not (0.1 <= timeout <= 10.0):
        errors.append("Timeout must be between 0.1 and 10 seconds.")


def validate_payload(payload, protocol: str, test_type: str, errors: list[str]) -> Optional[bytes]:
    """Returns decoded bytes if payload is present and valid, else None."""
    if payload is None:
        if test_type == "application_data":
            errors.append("A payload is required for the Application Data test.")
        return None

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
        if not HEX_PAIR_RE.match(cleaned):
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

    if len(data) > 4096:
        errors.append("Payload exceeds the 4096 byte limit for this prototype.")

    return data


def validate_action(action: NetworkAction) -> tuple[bool, list[str], Optional[bytes]]:
    """
    Validates a NetworkAction. Returns (is_valid, errors, decoded_payload_bytes).
    """
    errors: list[str] = []

    if action.protocol not in ALLOWED_TEST_TYPES_BY_PROTOCOL:
        errors.append(f"Protocol '{action.protocol}' is not supported.")
        return False, errors, None

    allowed_types = ALLOWED_TEST_TYPES_BY_PROTOCOL[action.protocol]
    if action.test_type not in allowed_types:
        errors.append(
            f"Test type '{action.test_type}' is not valid for protocol '{action.protocol}'. "
            f"Allowed: {', '.join(sorted(allowed_types))}"
        )

    from app.injection import node_registry  # local import avoids a circular import at module load

    if node_registry.get_node() is None:
        # Only check the PC's own interfaces when the PC itself will
        # execute the test. A configured node validates its own interfaces.
        validate_interface(action.interface, errors)

    validate_target_address(action.target.address, errors)

    port_required = action.protocol in ("TCP", "UDP")
    validate_port(action.target.port, port_required, errors)

    validate_timeout(action.timeout, errors)

    decoded_payload = validate_payload(action.payload, action.protocol, action.test_type, errors)

    return (len(errors) == 0), errors, decoded_payload
