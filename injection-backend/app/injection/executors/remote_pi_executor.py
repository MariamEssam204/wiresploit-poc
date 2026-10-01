"""
RemotePiExecutor - forwards an already PC-validated action to the
configured Raspberry Pi Injection Node over HTTP, and relays the result.

The Pi re-validates everything independently; the PC never trusts its
own validation as authorization for what the Pi will do.
"""

from __future__ import annotations

from typing import Optional

import requests

from app.injection import node_registry
from app.injection.executors.base import NetworkInjectionExecutor
from app.models.network_action import NetworkAction

# Small buffer on top of the action's own timeout so the HTTP call
# doesn't get cut off right as the node's own timeout is about to fire.
_HTTP_TIMEOUT_BUFFER = 3.0


class RemotePiExecutor(NetworkInjectionExecutor):
    def execute(self, action: NetworkAction, payload_bytes: Optional[bytes]) -> dict:
        node = node_registry.get_node()
        if node is None:
            return {"success": False, "error": "No injection node is configured."}

        url = f"{node_registry.node_base_url()}/api/v1/injection/execute"
        body = action.model_dump(mode="json")
        # Older Pi nodes gate on a dry_run flag (default True) and reject anything
        # without it as "Invalid action." The PC no longer models dry_run, so we
        # state explicitly that this is a real execution. Newer nodes ignore it.
        body["dry_run"] = False

        try:
            resp = requests.post(url, json=body, timeout=action.timeout + _HTTP_TIMEOUT_BUFFER)
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": f"Injection Node '{node.node_id}' at {node.address}:{node.port} is unreachable.",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": f"Injection Node '{node.node_id}' did not respond in time.",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }
        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "error": f"Could not reach injection node: {exc}",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }

        if resp.status_code == 409:
            return {
                "success": False,
                "error": f"Injection Node '{node.node_id}' is busy with another test. Try again shortly.",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }

        if resp.status_code != 200:
            detail = _safe_detail(resp)
            return {
                "success": False,
                "error": f"Injection Node returned an error: {detail}",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }

        data = resp.json()
        status = data.get("status")
        return {
            "success": status == "success",
            "error": None if status == "success" else (data.get("error") or data.get("message") or "Node execution failed."),
            "duration_ms": data.get("duration_ms"),
            "node_id": data.get("node_id", node.node_id),
            "node_type": "raspberry_pi",
            "packet_summary": data.get("packet_summary"),
            # ES-ready document the node built for this injection (timeline/DB).
            "event": data.get("event"),
        }


    def execute_uart_action(self, action, payload_bytes: Optional[bytes] = None) -> dict:
        """
        Forwards a UART action to the node's /api/v1/injection/uart/execute
        endpoint. Kept as a separate method (not overloading execute())
        because UART and Network actions are different domains with
        different result shapes - see spec section 19.
        """
        node = node_registry.get_node()
        if node is None:
            return {"success": False, "error": "No injection node is configured."}

        url = f"{node_registry.node_base_url()}/api/v1/injection/uart/execute"
        body = action.model_dump(mode="json")
        body["dry_run"] = False  # see note in execute(): satisfy older nodes' dry_run gate

        try:
            resp = requests.post(url, json=body, timeout=action.timeout + _HTTP_TIMEOUT_BUFFER)
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": f"Injection Node '{node.node_id}' at {node.address}:{node.port} is unreachable.",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": f"Injection Node '{node.node_id}' did not respond in time.",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }
        except requests.exceptions.RequestException as exc:
            return {
                "success": False,
                "error": f"Could not reach injection node: {exc}",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }

        if resp.status_code == 409:
            return {
                "success": False,
                "error": f"Injection Node '{node.node_id}' is busy with another test. Try again shortly.",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }

        if resp.status_code != 200:
            detail = _safe_detail(resp)
            return {
                "success": False,
                "error": f"Injection Node returned an error: {detail}",
                "node_id": node.node_id,
                "node_type": "raspberry_pi",
            }

        data = resp.json()
        status = data.get("status")
        success = status == "success"
        return {
            "success": success,
            "status": status,
            "error": None if success else (data.get("error") or "Node execution failed."),
            "duration_ms": data.get("duration_ms"),
            "node_id": data.get("node_id", node.node_id),
            "node_type": "raspberry_pi",
            "transmitted_bytes": data.get("transmitted_bytes"),
            "received_bytes": data.get("received_bytes"),
            "received_hex": data.get("received_hex"),
            "match": data.get("match"),
            "packet_summary": data.get("packet_summary"),
            "event": data.get("event"),
        }

    def get_node_health(self) -> dict:
        node = node_registry.get_node()
        if node is None:
            return {"connected": False, "detail": "No injection node configured."}
        try:
            resp = requests.get(f"{node_registry.node_base_url()}/api/v1/node/health", timeout=10)
            resp.raise_for_status()
            return {"connected": True, **resp.json()}
        except requests.exceptions.RequestException as exc:
            return {"connected": False, "detail": str(exc)}

    def get_node_info(self) -> dict:
        node = node_registry.get_node()
        if node is None:
            return {}
        try:
            resp = requests.get(f"{node_registry.node_base_url()}/api/v1/node/info", timeout=10)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.RequestException:
            return {}

    def get_uart_interfaces(self) -> list[dict]:
        node = node_registry.get_node()
        if node is None:
            return []
        try:
            resp = requests.get(f"{node_registry.node_base_url()}/api/v1/node/uart/interfaces", timeout=10)
            resp.raise_for_status()
            return resp.json().get("interfaces", [])
        except requests.exceptions.RequestException:
            return []


def _safe_detail(resp: requests.Response) -> str:
    try:
        payload = resp.json()
        return payload.get("detail") or payload.get("message") or str(payload)
    except ValueError:
        return resp.text[:300]
