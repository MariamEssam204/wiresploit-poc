"""Elasticsearch access layer — the datastore.

Index: `wiresploit-poc1` (config.ES_INDEX), security-enabled. Schema (dynamic:strict):

  timestamp    date_nanos   — capture time; SORT AUTHORITY (every read orders by it)
  event_type   keyword
  protocol     keyword
  duration     long
  length_bytes long
  payload_hex  wildcard     — raw payload as hex (may be null -> flagged malformed)
  psf          flattened    — Protocol Specific Field: a JSON blob of protocol fields

On READ every document is decorated with two computed (NOT stored) fields:
  payload_ascii  — payload_hex decoded to ASCII (backend-side, for the UI's right pane)
  malformed      — true when payload_hex is absent/null (per the "must be present" rule)

Substring-in-payload search hex-encodes the query and wildcard-matches payload_hex.
The document `id` keys the ES doc but is not a stored field.
"""
from __future__ import annotations

from typing import Any

from elasticsearch import Elasticsearch, helpers

from . import config

SORT_FIELD = "timestamp"


def _make_client() -> Elasticsearch:
    kw: dict[str, Any] = {"request_timeout": 15}
    if config.ES_API_KEY:
        kw["api_key"] = config.ES_API_KEY
    elif config.ES_USER and config.ES_PASSWORD:
        kw["basic_auth"] = (config.ES_USER, config.ES_PASSWORD)
    if str(config.ES_URL).startswith("https"):
        kw["verify_certs"] = config.ES_VERIFY_CERTS
    return Elasticsearch(config.ES_URL, **kw)


_es = _make_client()
INDEX = config.ES_INDEX

MAPPING: dict[str, Any] = {
    "mappings": {
        "dynamic": "strict",
        "properties": {
            "timestamp":    {"type": "date_nanos"},
            "event_type":   {"type": "keyword"},
            "protocol":     {"type": "keyword"},
            "duration":     {"type": "long"},
            "length_bytes": {"type": "long"},
            "payload_hex":  {"type": "wildcard"},
            "psf":          {"type": "flattened", "depth_limit": 50, "ignore_above": 8191},
        },
    },
}


# --- payload helpers -------------------------------------------------------

def hex_to_ascii(payload_hex) -> str:
    """Decode a hex payload to printable ASCII (non-printables -> '.')."""
    if not payload_hex:
        return ""
    clean = str(payload_hex).replace(" ", "").replace("\n", "").replace(":", "")
    try:
        raw = bytes.fromhex(clean)
    except ValueError:
        return ""
    return "".join(chr(b) if 32 <= b <= 126 else "." for b in raw)


def _decorate(source: dict[str, Any], _id: str) -> dict[str, Any]:
    """Add the computed (not stored) payload_ascii + malformed flag for the UI."""
    ph = source.get("payload_hex")
    psf = source.get("psf") or {}
    malformed = ph is None or "payload_hex" not in source or bool(psf.get("malformed"))
    return {**source, "id": _id, "payload_ascii": hex_to_ascii(ph), "malformed": malformed}


def decorate(doc: dict[str, Any]) -> dict[str, Any]:
    """Decorate a full doc (with `id`) into the UI shape — for SSE push at write
    time, so a streamed packet matches what recent()/search() return."""
    _id = doc.get("id")
    source = {k: v for k, v in doc.items() if k != "id"}
    return _decorate(source, str(_id))


# --- lifecycle -------------------------------------------------------------

def ping() -> bool:
    try:
        return bool(_es.ping())
    except Exception:
        return False


def ensure_index() -> None:
    if not _es.indices.exists(index=INDEX):
        _es.indices.create(index=INDEX, **MAPPING)


def index_packet(doc: dict[str, Any]) -> None:
    body = {k: v for k, v in doc.items() if k != "id"}
    _es.index(index=INDEX, id=str(doc["id"]), document=body)


def bulk_index(docs: list[dict[str, Any]]) -> int:
    if not docs:
        return 0
    actions = [
        {"_index": INDEX, "_id": str(d["id"]),
         "_source": {k: v for k, v in d.items() if k != "id"}}
        for d in docs
    ]
    ok, _ = helpers.bulk(_es, actions, refresh=False, raise_on_error=False)
    return ok


# --- reads (all sorted by timestamp) --------------------------------------

def search(q: str, size: int = 500) -> list[dict[str, Any]]:
    """Substring search. `abc` matches `abc` inside a payload (hex-encoded match
    on payload_hex), and also matches protocol / event_type / raw hex."""
    _es.indices.refresh(index=INDEX)
    q = (q or "").strip()
    if not q:
        body = {"query": {"match_all": {}}, "sort": [{SORT_FIELD: "asc"}], "size": size}
    else:
        should: list[dict[str, Any]] = []
        try:
            hexq = q.encode("utf-8", "ignore").hex()
        except Exception:
            hexq = ""
        if hexq:
            should.append({"wildcard": {"payload_hex": {"value": f"*{hexq}*", "case_insensitive": True}}})
        # also match if the user typed hex directly, and the keyword fields
        should.append({"wildcard": {"payload_hex": {"value": f"*{q.lower()}*", "case_insensitive": True}}})
        for f in ("protocol", "event_type"):
            should.append({"wildcard": {f: {"value": f"*{q}*", "case_insensitive": True}}})
        body = {
            "size": size,
            "sort": [{SORT_FIELD: "asc"}],
            "query": {"bool": {"minimum_should_match": 1, "should": should}},
        }
    res = _es.search(index=INDEX, **body)
    return [_decorate(h["_source"], h["_id"]) for h in res["hits"]["hits"]]


def recent(limit: int = 500) -> list[dict[str, Any]]:
    _es.indices.refresh(index=INDEX)
    try:
        n = _es.count(index=INDEX)["count"]
    except Exception:
        n = 0
    frm = max(0, n - limit)
    res = _es.search(index=INDEX, query={"match_all": {}},
                     sort=[{SORT_FIELD: "asc"}], from_=frm, size=limit)
    return [_decorate(h["_source"], h["_id"]) for h in res["hits"]["hits"]]


_TRACK_MAX = 10000


def all_ids(limit: int = _TRACK_MAX) -> set[str]:
    _es.indices.refresh(index=INDEX)
    res = _es.search(index=INDEX, query={"match_all": {}},
                     source=False, sort=[{SORT_FIELD: "asc"}], size=limit)
    return {h["_id"] for h in res["hits"]["hits"]}


def all_hits(limit: int = 5000) -> list[dict[str, Any]]:
    """Raw ES hits (with _id and _source), oldest-first — for the scan engine."""
    _es.indices.refresh(index=INDEX)
    res = _es.search(index=INDEX, query={"match_all": {}},
                     sort=[{SORT_FIELD: "asc"}], size=limit)
    return res["hits"]["hits"]


def latest_hits(limit: int = 5000) -> list[dict[str, Any]]:
    """Raw ES hits (with _id and _source) for the most recent `limit` documents,
    returned oldest-first.

    Unlike all_hits()/recent(), this never pages with `from_`, so it keeps
    working once the index grows past ES's max_result_window (10k) — and it
    windows onto the NEWEST documents, so a growing capture stays visible.
    """
    _es.indices.refresh(index=INDEX)
    res = _es.search(index=INDEX, query={"match_all": {}},
                     sort=[{SORT_FIELD: "desc"}], size=limit)
    return list(reversed(res["hits"]["hits"]))


def by_ids(ids: list[str]) -> list[dict[str, Any]]:
    ids = list(ids)
    if not ids:
        return []
    res = _es.search(index=INDEX, query={"ids": {"values": ids}},
                     sort=[{SORT_FIELD: "asc"}], size=len(ids))
    return [_decorate(h["_source"], h["_id"]) for h in res["hits"]["hits"]]


def stats() -> dict[str, Any]:
    try:
        _es.indices.refresh(index=INDEX)
        count = _es.count(index=INDEX)["count"]
    except Exception:
        count = 0
    return {"index": INDEX, "count": count}
