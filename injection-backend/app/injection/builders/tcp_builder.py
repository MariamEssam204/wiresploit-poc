"""
TCP test builder.

Design note: TCP tests are implemented with the Python standard
`socket` module rather than raw Scapy packets. A "TCP connection
test" and "TCP application data test" are just: connect, optionally
send bytes, close. Using a normal OS socket means the OS TCP stack
handles the handshake - there is no way for this code to construct
arbitrary flag combinations, spoof a source address, or send
malformed segments, which matches the "no arbitrary TCP flags"
requirement structurally rather than just by omission in the UI.
"""

from __future__ import annotations

import socket
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class TcpTestPlan:
    target_address: str
    target_port: int
    test_type: str  # "connection" | "application_data"
    payload: Optional[bytes]
    timeout: float


def summarize(plan: TcpTestPlan) -> str:
    if plan.test_type == "connection":
        return f"TCP connect() -> {plan.target_address}:{plan.target_port}"
    length = len(plan.payload) if plan.payload else 0
    return f"TCP connect()+send({length} bytes) -> {plan.target_address}:{plan.target_port}"


def execute(plan: TcpTestPlan) -> dict:
    start = time.monotonic()
    try:
        with socket.create_connection(
            (plan.target_address, plan.target_port), timeout=plan.timeout
        ) as sock:
            if plan.test_type == "application_data" and plan.payload:
                sock.sendall(plan.payload)
        duration_ms = (time.monotonic() - start) * 1000
        return {"success": True, "error": None, "duration_ms": duration_ms}
    except (ConnectionRefusedError, TimeoutError, OSError) as exc:
        duration_ms = (time.monotonic() - start) * 1000
        return {
            "success": False,
            "error": f"TCP test target {plan.target_address}:{plan.target_port} is not reachable ({exc}).",
            "duration_ms": duration_ms,
        }
