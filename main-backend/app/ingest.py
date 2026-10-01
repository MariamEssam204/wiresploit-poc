"""Capture ingest mapper -> the wiresploit-poc1 schema.

The ingest server receives batches the Pi pushes. Each record is normalized to:
  timestamp, event_type, protocol, duration, length_bytes, payload_hex, psf

`psf` (Protocol Specific Field) is a flattened JSON blob holding whatever
protocol-specific fields the packet carried. `payload_hex` MUST be present; if a
record arrives without a usable payload_hex it is stored as null and the packet is
flagged malformed (psf.malformed = true). Records may arrive mixed / out of order —
each keeps its own `timestamp` and every read sorts by it.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any


def _norm_hex(v) -> str | None:
    """Canonical continuous lowercase hex, or None if absent/invalid."""
    if v is None:
        return None
    s = str(v).replace(" ", "").replace(":", "").replace("\n", "").strip().lower()
    if not s:
        return None
    try:
        bytes.fromhex(s)
    except ValueError:
        return None
    return s


def _extract_payload_hex(rec: dict[str, Any]):
    for cand in (
        rec.get("payload_hex"),
        (rec.get("psf") or {}).get("payload_hex"),
        (rec.get("payload") or {}).get("payload_hex"),
    ):
        if cand not in (None, ""):
            return cand
    return None


def _timestamp(rec: dict[str, Any]):
    t = rec.get("timestamp")
    if isinstance(t, str) and t:
        return t  # ISO / date_nanos string, stored verbatim
    if isinstance(t, (int, float)):
        return int(t)  # epoch millis
    if isinstance(rec.get("ts"), (int, float)):
        return int(rec["ts"])
    if isinstance(rec.get("capture_ts_epoch"), (int, float)):
        return int(float(rec["capture_ts_epoch"]) * 1000)
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def _to_int(v, default: int = 0) -> int:
    try:
        return int(v) if v is not None else default
    except (TypeError, ValueError):
        return default


def map_record(rec: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(rec, dict):
        return None
    try:
        psf: dict[str, Any] = dict(rec.get("psf") or {})
        # Fold a cb_events network record's protocol-specific parts into psf.
        if "psf" not in rec and any(k in rec for k in ("ethernet", "ip", "transport")):
            for k in ("ethernet", "ip", "transport", "app_protocol", "arp", "application"):
                if rec.get(k) not in (None, {}, []):
                    psf[k] = rec[k]

        ph = _norm_hex(_extract_payload_hex(rec))
        if ph is None:
            psf["malformed"] = True  # payload_hex missing/invalid -> flag the packet

        ip = psf.get("ip") or {}
        event_type = (rec.get("event_type") or rec.get("type")
                      or ("network" if ip else ("bus" if (rec.get("bus") or psf.get("bus")) else "event")))

        length = (rec.get("length_bytes") or rec.get("frame_len") or rec.get("length")
                  or (len(bytes.fromhex(ph)) if ph else 0))

        return {
            "id": str(rec.get("cb_id") or rec.get("id") or uuid.uuid4()),
            "timestamp": _timestamp(rec),
            "event_type": event_type,
            "protocol": rec.get("protocol"),
            "duration": _to_int(rec.get("duration"), 0),
            "length_bytes": _to_int(length, 0),
            "payload_hex": ph,
            "psf": psf,
        }
    except Exception as e:
        print("[ingest] map failed:", e)
        return None


def map_batch(records: list) -> list[dict[str, Any]]:
    return [d for d in (map_record(r) for r in (records or [])) if d is not None]
