"""
Executor abstraction.

The Web UI and API routes never know which executor is in use - the
manager picks one. This is what lets the PC-only v0 path keep working
unmodified while Phase 2A adds a remote option.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.models.network_action import NetworkAction


class NetworkInjectionExecutor(ABC):
    @abstractmethod
    def execute(self, action: NetworkAction, payload_bytes: Optional[bytes]) -> dict:
        """
        Performs the real test.

        Must return a plain dict with at least:
            success: bool
            error: Optional[str]
        and may include:
            duration_ms: Optional[float]
            node_id: Optional[str]
            node_type: Optional[str]
        Must never raise - callers treat exceptions as a bug, not a
        reachability problem.
        """
        raise NotImplementedError
