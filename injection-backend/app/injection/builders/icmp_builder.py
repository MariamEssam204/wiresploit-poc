"""
ICMP echo test builder.

Design note: ICMP echo requests require raw/OS-assisted socket
access, so this is the one test type that uses Scapy. The packet
shape is fixed (IP/ICMP/payload) - the frontend cannot influence
ICMP type/code or add extra layers.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class IcmpTestPlan:
    target_address: str
    payload: bytes
    timeout: float


def build_packet(plan: IcmpTestPlan):
    """Builds (but does not send) the Scapy ICMP echo packet."""
    from scapy.all import IP, ICMP, Raw  # imported lazily so this module loads even without scapy installed

    pkt = IP(dst=plan.target_address) / ICMP() / Raw(load=plan.payload)
    return pkt


def summarize(plan: IcmpTestPlan) -> str:
    return f"IP(dst={plan.target_address})/ICMP()/Raw(len={len(plan.payload)})"


_PERMISSION_ERROR_HINT = (
    "ICMP requires elevated privileges on this OS. Run the backend with "
    "sudo (e.g. `sudo uvicorn app.main:app --reload --port 8000`), or on "
    "Linux grant the interpreter CAP_NET_RAW instead of running as root "
    "(`sudo setcap cap_net_raw+eip $(which python3)`)."
)

# Scapy/OS raw-socket permission failures don't always surface as a Python
# PermissionError - on macOS, for example, Scapy raises a generic OSError
# with a message about /dev/bpf*. We match on message content as a
# fallback so the UI shows a clear, actionable message either way.
_PERMISSION_ERROR_MARKERS = (
    "permission denied",
    "operation not permitted",
    "/dev/bpf",
    "must be root",
    "running as root",
)


def _is_permission_error(exc: Exception) -> bool:
    if isinstance(exc, PermissionError):
        return True
    message = str(exc).lower()
    return any(marker in message for marker in _PERMISSION_ERROR_MARKERS)


def execute(plan: IcmpTestPlan) -> dict:
    """
    Sends a single ICMP echo request and waits for a reply.
    Returns a plain dict describing the outcome; never raises to caller.
    """
    from scapy.all import sr1

    pkt = build_packet(plan)
    try:
        reply = sr1(pkt, timeout=plan.timeout, verbose=0)
    except Exception as exc:  # pragma: no cover - defensive
        if _is_permission_error(exc):
            return {"success": False, "error": _PERMISSION_ERROR_HINT}
        return {"success": False, "error": str(exc)}

    if reply is None:
        return {"success": False, "error": f"No ICMP reply from {plan.target_address} within {plan.timeout}s."}
    return {"success": True, "error": None}
