"""
Injection Node configuration models.

Phase 2A supports exactly one manually-configured Raspberry Pi node.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class NodeConfig(BaseModel):
    node_id: str = Field(..., description="Human-readable node identifier, e.g. NET-INJECTOR-01")
    address: str = Field(..., description="IP or hostname of the injection node")
    port: int = Field(9000, ge=1, le=65535)


class NodeStatus(BaseModel):
    node_id: Optional[str] = None
    address: Optional[str] = None
    port: Optional[int] = None
    connected: bool
    node_status: Optional[str] = None  # ready / busy / error, as reported by the node
    scapy: Optional[bool] = None
    detail: Optional[str] = None
