"""
Normalized data models for Wiresploit Network Injection.

These models define the ONLY shape of data that can cross the
frontend -> backend boundary. There is deliberately no field that
could carry arbitrary code, arbitrary packet layers, a spoofed
source address, or an unbounded repeat/rate count.
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

Protocol = Literal["ICMP", "TCP", "UDP"]

# Only these predefined test types exist. There is no "custom" type.
TestType = Literal[
    "echo",                 # ICMP
    "connection",            # TCP - connect only, no payload
    "application_data",      # TCP - connect + send payload
    "datagram",               # UDP - send payload
]

PayloadFormat = Literal["text", "hex"]

ActionStatus = Literal[
    "pending",
    "validated",
    "invalid",
    "running",
    "success",
    "failed",
    "aborted",
]


class Target(BaseModel):
    address: str = Field(..., description="Destination host, e.g. an ESP32's LAN IP or 127.0.0.1")
    port: Optional[int] = Field(None, description="Destination port, required for TCP/UDP")


class Payload(BaseModel):
    format: PayloadFormat
    value: str


class NetworkAction(BaseModel):
    """
    A fully normalized, predefined network test action.

    NOTE: There is intentionally NO source_ip, source_mac, count,
    rate, or raw_packet field. See docs/SAFETY.md.
    """

    action_id: Optional[str] = None
    domain: Literal["network_injection"] = "network_injection"
    protocol: Protocol
    test_type: TestType
    interface: str
    target: Target
    payload: Optional[Payload] = None
    timeout: float = Field(2.0, ge=0.1, le=10.0)


class ValidationResult(BaseModel):
    valid: bool
    action_id: Optional[str] = None
    errors: list[str] = Field(default_factory=list)
    message: str = ""


class ExecutionResult(BaseModel):
    action_id: str
    status: ActionStatus
    protocol: Protocol
    test_type: TestType
    interface: str
    target: Target
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    message: str = ""
    error: Optional[str] = None
    packet_summary: Optional[str] = None
    # Phase 2A - which executor actually ran the test.
    node_id: Optional[str] = None
    node_type: Optional[Literal["pc_local", "raspberry_pi"]] = None
