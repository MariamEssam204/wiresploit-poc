"""
PC-side UART models - the same normalized shape the Pi expects, plus
the PC's own ValidationResult/ExecutionResult wrappers used by the
Web UI and audit log.
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

DataBits = Literal[5, 6, 7, 8]
Parity = Literal["none", "even", "odd", "mark", "space"]
StopBits = Literal[1, 1.5, 2]
FlowControl = Literal["none", "rts_cts", "xon_xoff"]
PayloadFormat = Literal["text", "hex"]


class UARTConfiguration(BaseModel):
    baud_rate: int
    data_bits: DataBits = 8
    parity: Parity = "none"
    stop_bits: StopBits = 1
    flow_control: FlowControl = "none"


class UARTPayload(BaseModel):
    format: PayloadFormat
    value: str


class UARTAction(BaseModel):
    action_id: Optional[str] = None
    domain: Literal["uart_injection"] = "uart_injection"
    interface: str
    configuration: UARTConfiguration
    payload: UARTPayload
    timeout: float = Field(2.0, ge=0.1, le=30.0)
    # False (default): capture whatever the DUT sends back, no comparison -
    #   the normal mode when talking to a real device like an ESP32, whose
    #   response won't equal what you sent.
    # True: require the received bytes to exactly match the transmitted
    #   payload - only meaningful with TX physically wired straight to RX
    #   (a true loopback test of the wiring itself, not a DUT).
    compare_response: bool = False


class UARTValidationResult(BaseModel):
    valid: bool
    action_id: Optional[str] = None
    errors: list[str] = Field(default_factory=list)
    message: str = ""


class UARTExecutionResult(BaseModel):
    action_id: str
    status: str
    interface: str
    configuration: UARTConfiguration
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    message: str = ""
    error: Optional[str] = None
    transmitted_bytes: Optional[int] = None
    received_bytes: Optional[int] = None
    received_hex: Optional[str] = None
    match: Optional[bool] = None
    packet_summary: Optional[str] = None
    node_id: Optional[str] = None
    node_type: Optional[Literal["raspberry_pi"]] = None
