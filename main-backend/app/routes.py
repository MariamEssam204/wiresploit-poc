"""HTTP API.

  capture -> ES (persist ONLY while capturing; dropped when stopped) -> SSE stream -> UI timeline
  UI -> GET /api/search?q= -> ES wildcard query (substring-in-payload)
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Body, Request, Response
from sse_starlette.sse import EventSourceResponse

from . import ingest, store, context_analysis
from .capture import engine
from .scan.patterns import scan_es_hits, RULES, _is_fallback

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok", "elasticsearch": store.ping(), **store.stats(),
            "capturing": engine.capturing}


@router.post("/capture/start")
async def capture_start():
    await engine.start()
    return {"capturing": True}


@router.post("/capture/stop")
async def capture_stop():
    await engine.stop()
    return {"capturing": False}


@router.get("/capture/status")
def capture_status():
    return {"capturing": engine.capturing, **store.stats()}


@router.post("/capture/ingest")
def capture_ingest(payload: dict = Body(...)):
    """Ingest server: the Pi pushes batches of captured events here — both
    NETWORK (cb_events shape) and ONBOARD bus (UART/SPI/I2C). Records are
    normalized to the unified schema and bulk-indexed. Arrival order does not
    matter: each keeps its Pi-assigned `ts` and every view sorts by it.

    Body: {"records": [...]} (also accepts {"packets": [...]})."""
    records = payload.get("records")
    if records is None:
        records = payload.get("packets", [])
    # Persist ONLY while capturing. When capture is stopped, incoming packets are
    # DROPPED (not written to Elasticsearch) — the DB holds a packet only if it
    # arrived between Start capture and Stop capture. This also gates injection
    # events (they arrive through this same endpoint).
    if not engine.capturing:
        return {"received": len(records), "indexed": 0,
                "skipped": len(records), "dropped": len(records), "capturing": False}
    docs = ingest.map_batch(records)
    written = store.bulk_index(docs)
    # Push each new document straight to the UI over SSE (no polling).
    for d in docs:
        engine.push(store.decorate(d))
    return {"received": len(records), "indexed": written, "skipped": len(records) - len(docs)}


@router.get("/packets")
def packets(limit: int = 500):
    """Recent packets straight from poc_index — the timeline's initial fill.
    The UI loads this on open, then live-appends new docs from /stream."""
    return {"packets": store.recent(limit)}


@router.get("/findings")
def findings(limit: int = 5000):
    """Run the scan engine over poc_index and return aggregated findings.
    Each finding is a unique (type, value) with every occurrence attached —
    record_id links back to the packet on the Live Timeline."""
    hits = store.all_hits(limit)
    result = []
    for f in scan_es_hits(hits):
        result.append({
            "finding_type": f.finding_type,
            "value": f.value,
            "rule": f.rule_matched,
            "is_fallback": _is_fallback(f),
            "count": len(f.occurrences),
            "occurrences": [
                {"record_id": o.record_id, "ts": o.timestamp, "bus": o.bus,
                 "protocol": o.protocol, "offset": o.offset, "end_offset": o.end_offset,
                 "context": o.context}
                for o in f.occurrences
            ],
        })
    # Most-seen findings first.
    result.sort(key=lambda x: x["count"], reverse=True)
    return {"findings": result, "packets_scanned": len(hits), "rules_loaded": len(RULES)}


@router.get("/context-analysis")
def get_context_analysis(response: Response, limit: int = 10000):
    """Context Analysis engine over poc_index: the ordered event sequence plus
    the correlated activities each event belongs to. The UI draws the behavior
    diagram from this.

    Recomputed per request and explicitly uncacheable — re-running after new
    capture must reflect the datastore, never a stale response."""
    response.headers["Cache-Control"] = "no-store"
    result = context_analysis.analyze(limit)
    return {
        **result,
        "stats": {
            "events": len(result["events"]),
            "activities": len(result["activities"]),
            "endpoints": len(result["endpoints"]),
        },
    }


@router.get("/search")
def search(q: str = ""):
    return {"query": q, "results": store.search(q)}


@router.get("/stream")
async def stream(request: Request):
    """SSE mirror of poc_index. Emits `packet` when a document is added to the
    DB and `removed` when one is deleted, so the timeline stays in sync with the
    datastore live. Reconnect-safe."""
    queue = engine.subscribe()

    async def gen():
        try:
            yield {"event": "ready", "data": json.dumps({"capturing": engine.capturing})}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15)
                    if msg.get("op") == "remove":
                        yield {"event": "removed", "data": json.dumps({"id": msg["id"]})}
                    else:
                        yield {"event": "packet", "data": json.dumps(msg["packet"])}
                except asyncio.TimeoutError:
                    yield {"event": "ping", "data": "{}"}  # keep-alive
        finally:
            engine.unsubscribe(queue)

    return EventSourceResponse(gen())
