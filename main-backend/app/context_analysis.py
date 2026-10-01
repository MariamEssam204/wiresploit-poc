"""Context Analysis engine — behavior / context sequence of a capture.

Answers one question: *which captured events belong to the same activity, and in
what order did they happen?*

  poc_index -> normalize -> baseline correlation -> activities + summaries (JSON)

Correlation is a baseline, not a causality claim: two events are grouped when
they fall within CORRELATION_WINDOW_SEC of each other AND share a known
endpoint. Grouping is transitive (union-find), so a chain of overlapping events
forms one activity. Every event ends up in exactly one activity, singletons
included.

The UI renders the sequence diagram from this JSON; see
frontend/src/components/ContextAnalysis.jsx.
"""
from __future__ import annotations

import traceback
from collections import Counter
from datetime import datetime

from . import store

# Two events more than this far apart are never grouped, even if they share an
# endpoint — an endpoint reappearing much later is a separate activity.
CORRELATION_WINDOW_SEC = 2.0

# Endpoint placeholders that must never be treated as a shared participant,
# otherwise every unattributable event would correlate with every other.
_UNKNOWN = {None, "", "Unknown"}


# --- poc_index -> event shape ---------------------------------------------

def _parse_timestamp(value, fallback):
    """poc_index stores `timestamp` as either epoch seconds or an ISO-8601
    string ('Z' or an offset, up to nanosecond precision). Return epoch
    seconds — the diagram works in seconds relative to the first event."""
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return fallback
    if isinstance(value, (int, float)):
        seconds = float(value)
        # Guard against a record that arrived in epoch millis.
        return seconds / 1000.0 if seconds > 4102444800 else seconds
    return fallback


def _endpoints(doc):
    """The two participants an event is drawn between.

    Addresses sit under `psf.psd`, and where depends on the protocol: the IP
    block for TCP/UDP/ICMP, the ARP block for ARP (whose `ip` is null),
    Ethernet MACs as a last resort. An onboard bus record has no direction on
    the wire, so both ends are the tapped port and it renders as a
    self-message.
    """
    psf = doc.get("psf") or {}
    psd = psf.get("psd") or {}

    ip = psd.get("ip") or {}
    src, dst = ip.get("src_ip"), ip.get("dst_ip")

    if not (src and dst):
        transport = psd.get("transport") or {}  # ARP: psrc/pdst, else hwsrc/hwdst
        src = src or transport.get("psrc") or transport.get("hwsrc")
        dst = dst or transport.get("pdst") or transport.get("hwdst")

    if not (src and dst):
        ethernet = psd.get("ethernet") or {}
        src = src or ethernet.get("src_mac")
        dst = dst or ethernet.get("dst_mac")

    if src and dst:
        return str(src), str(dst)

    protocol = doc.get("protocol") or "bus"
    port = psd.get("port") or psf.get("port")
    if port is None:
        channel = psd.get("channel", psf.get("channel"))
        port = f"ch{channel}" if channel is not None else None
    label = f"{protocol}:{port}" if port is not None else str(protocol)
    return label, label


def _payload(doc):
    """Readable payload for the detail panel: the ASCII decode the timeline
    shows, falling back to raw hex when nothing printable comes out.
    (`store.all_hits` returns undecorated hits, so this is computed here.)"""
    payload_hex = doc.get("payload_hex")
    if not payload_hex:
        return ""
    ascii_text = store.hex_to_ascii(payload_hex)
    return ascii_text if ascii_text and ascii_text.strip(".") else str(payload_hex)


def load_events(limit=10000):
    """poc_index -> events ordered by capture time, with `rel_ts` seconds from
    the first event.

    Windows onto the most recent `limit` documents, so a capture that outgrows
    the window keeps showing current behaviour rather than freezing on its
    oldest events.
    """
    events = []
    for index, hit in enumerate(store.latest_hits(limit)):
        doc = hit.get("_source") or {}
        record_id = hit.get("_id", f"event-{index}")
        source, destination = _endpoints(doc)
        events.append({
            "event_id": record_id,
            "record_id": record_id,      # links back to the Live Timeline row
            "ts": _parse_timestamp(doc.get("timestamp"), float(index)),
            "source": source,
            "destination": destination,
            "protocol": doc.get("protocol") or "Unknown",
            "event_type": doc.get("event_type") or "Unknown",
            "length_bytes": doc.get("length_bytes") or 0,
            "payload": _payload(doc),
        })

    events.sort(key=lambda event: event["ts"])
    first = events[0]["ts"] if events else 0
    for event in events:
        event["rel_ts"] = event["ts"] - first
    return events


# --- correlation -----------------------------------------------------------

class _DisjointSet:
    """Union-find with path halving — groups transitively related events."""

    def __init__(self, size):
        self._parent = list(range(size))

    def find(self, item):
        parent = self._parent
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a != root_b:
            self._parent[root_b] = root_a


def _participants(event):
    """The event's known endpoints — placeholders dropped, so unattributable
    events cannot correlate with anything."""
    return {event["source"], event["destination"]} - _UNKNOWN


def correlate(events, window=CORRELATION_WINDOW_SEC):
    """Group events into activities. Returns a cluster index per event,
    numbered from 0 in order of first appearance.

    `events` must already be sorted by time, which lets the inner scan stop at
    the first event beyond the window instead of comparing every pair.
    """
    groups = _DisjointSet(len(events))
    endpoints = [_participants(event) for event in events]

    for i, event_a in enumerate(events):
        for j in range(i + 1, len(events)):
            if events[j]["rel_ts"] - event_a["rel_ts"] > window:
                break
            if endpoints[i] & endpoints[j]:
                groups.union(i, j)

    cluster_of_root, clusters = {}, []
    for index in range(len(events)):
        root = groups.find(index)
        if root not in cluster_of_root:
            cluster_of_root[root] = len(cluster_of_root)
        clusters.append(cluster_of_root[root])
    return clusters


def build_activities(events, clusters):
    """One summary per activity: span, protocol mix, participants, members."""
    members = {}
    for event, cluster in zip(events, clusters):
        members.setdefault(cluster, []).append(event)

    activities = []
    for cluster in sorted(members):
        group = members[cluster]
        times = [event["rel_ts"] for event in group]
        start, end = min(times), max(times)

        participants = Counter()
        for event in group:
            for endpoint in _participants(event):
                participants[endpoint] += 1

        activities.append({
            "cluster": cluster,
            "label": f"Activity {cluster + 1}",
            "count": len(group),
            "start": start,
            "end": end,
            "duration": max(end - start, 0.0),
            "protocols": [
                {"protocol": protocol, "count": count}
                for protocol, count in Counter(
                    event["protocol"] for event in group
                ).most_common()
            ],
            "participants": [
                {"entity": entity, "count": count}
                for entity, count in participants.most_common()
            ],
            "event_ids": [event["event_id"] for event in group],
        })
    return activities


# --- engine entry point ----------------------------------------------------

def analyze(limit=10000):
    """Run the engine over poc_index and return the diagram's data."""
    try:
        events = load_events(limit)
        if not events:
            return {"error": None, "events": [], "activities": [],
                    "endpoints": [], "protocols": []}

        clusters = correlate(events)
        activities = build_activities(events, clusters)

        labels = {a["cluster"]: a["label"] for a in activities}
        for event, cluster in zip(events, clusters):
            event["cluster"] = cluster
            event["activity"] = labels[cluster]

        # Lifelines in order of first appearance, so the diagram reads
        # left-to-right in roughly the order the capture introduces endpoints.
        endpoints, protocols = [], []
        for event in events:
            for endpoint in (event["source"], event["destination"]):
                if endpoint not in endpoints:
                    endpoints.append(endpoint)
            if event["protocol"] not in protocols:
                protocols.append(event["protocol"])

        print(f"[context_analysis] {len(events)} events, "
              f"{len(endpoints)} endpoints, {len(activities)} activities")

        return {
            "error": None,
            "events": events,
            "activities": activities,
            "endpoints": endpoints,
            "protocols": protocols,
        }

    except Exception as e:
        print("[context_analysis] failed:\n" + traceback.format_exc())
        return {"error": f"{type(e).__name__}: {e}", "events": [],
                "activities": [], "endpoints": [], "protocols": []}
