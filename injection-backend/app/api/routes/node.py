from typing import Optional

import requests
from fastapi import APIRouter, HTTPException

from app.injection import node_registry
from app.models.node import NodeConfig, NodeStatus

router = APIRouter()


@router.get("/node/config", response_model=Optional[NodeConfig])
def get_node_config():
    return node_registry.get_node()


@router.post("/node/config", response_model=NodeConfig)
def set_node_config(config: NodeConfig):
    return node_registry.set_node(config)


@router.delete("/node/config")
def clear_node_config():
    node_registry.clear_node()
    return {"cleared": True}


@router.get("/node/health", response_model=NodeStatus)
def check_node_health():
    """
    Used by the 'Test Connection' button. Proxies the node's own
    health/info endpoints so the PC never needs direct network access
    beyond a normal HTTP call to the configured node.
    """
    node = node_registry.get_node()
    if node is None:
        return NodeStatus(connected=False, detail="No injection node configured.")

    base = node_registry.node_base_url()
    try:
        health_resp = requests.get(f"{base}/api/v1/node/health", timeout=10)
        health_resp.raise_for_status()
        health_data = health_resp.json()

        info_data = {}
        try:
            info_resp = requests.get(f"{base}/api/v1/node/info", timeout=10)
            if info_resp.ok:
                info_data = info_resp.json()
        except requests.exceptions.RequestException:
            pass  # health succeeded; info is a nice-to-have

        return NodeStatus(
            node_id=health_data.get("node_id", node.node_id),
            address=node.address,
            port=node.port,
            connected=True,
            node_status=health_data.get("status"),
            scapy=info_data.get("scapy"),
        )
    except requests.exceptions.RequestException as exc:
        return NodeStatus(
            node_id=node.node_id,
            address=node.address,
            port=node.port,
            connected=False,
            detail=str(exc),
        )


@router.get("/node/interfaces")
def node_interfaces():
    node = node_registry.get_node()
    if node is None:
        raise HTTPException(status_code=400, detail="No injection node configured.")
    try:
        resp = requests.get(f"{node_registry.node_base_url()}/api/v1/node/interfaces", timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach injection node: {exc}")
