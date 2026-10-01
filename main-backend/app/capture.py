"""Live timeline engine — SSE delivery to the browser.

The browser receives packets over a persistent SSE stream (a live push, never
browser-polling and never a page reload). New documents reach the stream two ways:

  1. push()  — documents written THROUGH the backend (ingest, injections) are
     pushed the instant they are written (zero latency).
  2. _watch() — documents written to Elasticsearch by ANY path (e.g. the capture
     node writing straight to ES) are detected by the backend watching the index
     and relayed to the browser. Elasticsearch cannot push to us, so this internal
     check is the only way to surface externally-written docs live; it is NOT the
     browser polling, and both paths are deduplicated by id in the UI.

start()/stop() gate delivery: while stopped the DB still receives everything but
nothing is pushed (the user presses "Start capture" to begin). Messages are
envelopes on each subscriber queue: {"op": "add", "packet": {...}}.
"""
from __future__ import annotations

import asyncio
from typing import Any

from . import config, store


class CaptureEngine:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._event_loop: asyncio.AbstractEventLoop | None = None
        self._task: asyncio.Task | None = None
        self._capturing = False
        self._known_ids: set[str] = set()  # last index snapshot (for the watcher)

    @property
    def capturing(self) -> bool:
        return self._capturing

    def subscribe(self) -> asyncio.Queue:
        try:
            self._event_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
        q: asyncio.Queue = asyncio.Queue(maxsize=2000)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    async def start(self) -> None:
        """Begin live delivery. Seeds the snapshot with the docs already in the
        index so existing rows are not re-announced (history is loaded separately
        via GET /api/packets), then watches for anything new."""
        try:
            self._event_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
        if not self._capturing:
            try:
                self._known_ids = store.all_ids()
            except Exception as e:
                print("[watch] could not seed snapshot:", e)
                self._known_ids = set()
        self._capturing = True
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._watch())

    async def stop(self) -> None:
        self._capturing = False

    def push(self, packet: dict[str, Any]) -> None:
        """Instant push for a doc written through the backend. No-op while stopped.
        The id is remembered so the watcher does not re-announce the same doc."""
        if not self._capturing:
            return
        pid = str(packet.get("id"))
        if pid in self._known_ids:
            return
        self._known_ids.add(pid)
        self._broadcast({"op": "add", "packet": packet})

    async def _watch(self) -> None:
        while True:
            if self._capturing:
                try:
                    self._reconcile_once()
                except Exception as e:
                    print("[watch] check failed:", e)
            await asyncio.sleep(config.TAIL_INTERVAL_SEC)

    def _reconcile_once(self) -> None:
        current = store.all_ids()
        added = current - self._known_ids
        removed = self._known_ids - current
        if not added and not removed:
            return
        if added:
            for doc in store.by_ids(list(added)):  # oldest-first (by timestamp)
                self._broadcast({"op": "add", "packet": doc})
        for rid in removed:
            self._broadcast({"op": "remove", "id": str(rid)})
        self._known_ids = current

    @staticmethod
    def _put(q: "asyncio.Queue", msg: dict[str, Any]) -> None:
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            pass  # backpressure affects UI delivery only — the DB already has it

    def _broadcast(self, msg: dict[str, Any]) -> None:
        loop = self._event_loop
        for q in list(self._subscribers):
            if loop is not None:
                loop.call_soon_threadsafe(self._put, q, msg)
            else:
                self._put(q, msg)


engine = CaptureEngine()
