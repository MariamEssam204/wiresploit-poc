"""
Holds the single configured Injection Node for Phase 2A.

Phase 2A deliberately supports exactly one node. This is an in-memory
store (not persisted) - reconfigure it after a backend restart via
POST /api/node/config.
"""

from __future__ import annotations

from typing import Optional

from app.models.node import NodeConfig

_current_node: Optional[NodeConfig] = None


def set_node(config: NodeConfig) -> NodeConfig:
    global _current_node
    _current_node = config
    return _current_node


def get_node() -> Optional[NodeConfig]:
    return _current_node


def clear_node() -> None:
    global _current_node
    _current_node = None


def node_base_url() -> Optional[str]:
    node = get_node()
    if node is None:
        return None
    return f"http://{node.address}:{node.port}"
