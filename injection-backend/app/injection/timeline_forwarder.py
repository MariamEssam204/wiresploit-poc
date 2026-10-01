"""
Forwards an injection's Elasticsearch-ready event to the main Wiresploit
backend's ingest endpoint. The main backend stores it in Elasticsearch (as a
packet, event_type="injection") AND live-pushes it to the timeline over SSE.

The node (Raspberry Pi) builds this `event` document itself — it is the part of
the node's JSON response that matches the ES mapping. Everything else in the
response is UI-only detail and is NOT stored.

Fire-and-forget: a forwarding failure (main backend down, ES unavailable) must
NEVER affect the injection result. This mirrors the ES handoff contract:
"If the endpoint is unavailable or indexing fails, the backend logs the error
and does not fail the injection."
"""

from __future__ import annotations

import os
import threading
from typing import Any, Optional

import requests

# The main backend's ingest endpoint. Same PC by default; override with env
# WIRESPLOIT_INGEST_URL if the main backend runs elsewhere / on another port.
INGEST_URL = (
    os.environ.get("WIRESPLOIT_INGEST_URL")
    or "http://127.0.0.1:8000/api/capture/ingest"
).strip()

_TIMEOUT = 5.0


def _post(event: dict[str, Any]) -> None:
    try:
        requests.post(INGEST_URL, json={"records": [event]}, timeout=_TIMEOUT)
    except Exception as exc:  # never propagate — injection must not fail on this
        print(f"[timeline_forwarder] could not forward injection event "
              f"to {INGEST_URL}: {exc}")


def forward_event(event: Optional[dict[str, Any]]) -> None:
    """Forward one injection event to the main backend, off the request path.

    No-op when there is no event (e.g. a PC-local execution, which does not
    produce a node event document)."""
    if not event:
        return
    threading.Thread(target=_post, args=(event,), daemon=True).start()
