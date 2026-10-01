"""
UDP datagram test builder.

Uses a standard UDP socket to send exactly one datagram to the
validated target/port. No raw packet construction, no ability to
set a custom source address.
"""

from __future__ import annotations

import socket
import time
from dataclasses import dataclass


@dataclass
class UdpTestPlan:
    target_address: str
    target_port: int
    payload: bytes
    timeout: float


def summarize(plan: UdpTestPlan) -> str:
    return f"UDP sendto({len(plan.payload)} bytes) -> {plan.target_address}:{plan.target_port}"


def execute(plan: UdpTestPlan) -> dict:
    start = time.monotonic()
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.settimeout(plan.timeout)
            sock.sendto(plan.payload, (plan.target_address, plan.target_port))
        duration_ms = (time.monotonic() - start) * 1000
        return {"success": True, "error": None, "duration_ms": duration_ms}
    except OSError as exc:
        duration_ms = (time.monotonic() - start) * 1000
        return {
            "success": False,
            "error": f"UDP send to {plan.target_address}:{plan.target_port} failed ({exc}).",
            "duration_ms": duration_ms,
        }
