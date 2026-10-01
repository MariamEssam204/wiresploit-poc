"""
LocalPCExecutor - the original v0 behavior, unchanged.

Runs the test directly on this PC using the same ICMP/TCP/UDP builders
from Phase 1. This stays the default when no Injection Node is
configured, so the PC-only workflow keeps working exactly as before.
"""

from __future__ import annotations

from typing import Optional

from app.injection.builders import icmp_builder, tcp_builder, udp_builder
from app.injection.executors.base import NetworkInjectionExecutor
from app.models.network_action import NetworkAction


class LocalPCExecutor(NetworkInjectionExecutor):
    def execute(self, action: NetworkAction, payload_bytes: Optional[bytes]) -> dict:
        if action.protocol == "ICMP":
            plan = icmp_builder.IcmpTestPlan(
                target_address=action.target.address,
                payload=payload_bytes or b"",
                timeout=action.timeout,
            )
            outcome = icmp_builder.execute(plan)
        elif action.protocol == "TCP":
            plan = tcp_builder.TcpTestPlan(
                target_address=action.target.address,
                target_port=action.target.port,
                test_type=action.test_type,
                payload=payload_bytes,
                timeout=action.timeout,
            )
            outcome = tcp_builder.execute(plan)
        else:
            plan = udp_builder.UdpTestPlan(
                target_address=action.target.address,
                target_port=action.target.port,
                payload=payload_bytes or b"",
                timeout=action.timeout,
            )
            outcome = udp_builder.execute(plan)

        outcome.setdefault("node_id", None)
        outcome.setdefault("node_type", "pc_local")
        return outcome
