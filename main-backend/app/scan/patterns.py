"""Findings & credential scan engine (Phase 1, regex-based).

Ported from the standalone scan_engine/ PoC into the backend so it can run over
poc_index. Detection logic is unchanged; the only adaptation is that poc_index
stores the bus under `type` (not `bus`), which scan_es_hits maps accordingly.

Rules match against a record's payload_ascii; identical findings are aggregated
by (finding_type, value) with every occurrence attached.
"""
import re
from dataclasses import dataclass, field
from typing import Optional


def _hex_to_ascii(payload_hex) -> str:
    if not payload_hex:
        return ""
    clean = str(payload_hex).replace(" ", "").replace(":", "").replace("\n", "")
    try:
        raw = bytes.fromhex(clean)
    except ValueError:
        return ""
    return "".join(chr(b) if 32 <= b <= 126 else "." for b in raw)


# ---------------------------------------------------------------------------
# Rule definition
# ---------------------------------------------------------------------------

@dataclass
class Rule:
    finding_type: str
    pattern: re.Pattern
    is_fallback: bool = False


# ---------------------------------------------------------------------------
# Regex rules
# ---------------------------------------------------------------------------

_SEP = r'["\']?\s*[:=]\s*'
_VALUE = r'["\']?([^"\'\s&,;]+)'


RULES = [
    Rule("password", re.compile(r'\b(?:password|passwd|pwd)\b' + _SEP + _VALUE, re.I)),
    Rule("token", re.compile(
        r'\b(?:token|access_token|refresh_token|session_token)\b' + _SEP + _VALUE, re.I)),
    Rule("authorization_bearer", re.compile(r'\bAuthorization\s*:\s*Bearer\s+(\S+)', re.I)),
    Rule("api_key", re.compile(r'\b(?:api[_-]?key|api[_-]?secret)\b' + _SEP + _VALUE, re.I)),
    Rule("secret", re.compile(r'\bsecret\b' + _SEP + _VALUE, re.I)),
    Rule("username", re.compile(r'\b(?:username|user_name)\b' + _SEP + _VALUE, re.I)),
    Rule("session", re.compile(r'\b(?:session_id|session_token)\b' + _SEP + _VALUE, re.I)),
    Rule("wifi_credential", re.compile(
        r'\b(?:wifi_password|wifi_psk|wpa_psk|wpa2_psk|psk)\b' + _SEP + _VALUE, re.I)),
    # Fallback: catches things like "userpassword=hunter2".
    Rule("password_unanchored",
         re.compile(r'(?:password|passwd|pwd)' + _SEP + _VALUE, re.I), is_fallback=True),
    Rule("private_key", re.compile(r'-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----')),
    Rule("certificate", re.compile(r'-----BEGIN CERTIFICATE-----')),
    Rule("openssh_private_key", re.compile(r'-----BEGIN OPENSSH PRIVATE KEY-----')),
]


# ---------------------------------------------------------------------------
# Occurrence / Finding
# ---------------------------------------------------------------------------

@dataclass
class Occurrence:
    """One place where a finding was observed. A Finding may have many."""
    record_id: str
    timestamp: Optional[str]
    offset: int
    end_offset: int
    bus: Optional[str] = None
    protocol: Optional[str] = None
    length: Optional[int] = None
    context: Optional[str] = None  # payload_ascii snippet around the match (traceability)


@dataclass
class Finding:
    """One unique finding (finding_type + value) with all its occurrences."""
    finding_type: str
    value: str
    rule_matched: str
    occurrences: list[Occurrence] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Scan one record
# ---------------------------------------------------------------------------

def scan_record(record_id, record_text, timestamp=None, bus=None, protocol=None, length=None):
    """Scan one decoded packet/record with all rules; returns raw findings."""
    findings = []
    for rule in RULES:
        for match in rule.pattern.finditer(record_text):
            if match.groups():
                value = match.group(match.lastindex) if match.lastindex else match.group(0)
                start = match.start(match.lastindex) if match.lastindex else match.start()
                end = match.end(match.lastindex) if match.lastindex else match.end()
            else:
                value = match.group(0)
                start = match.start()
                end = match.end()

            lo = max(0, start - 60)
            hi = min(len(record_text), end + 60)
            occurrence = Occurrence(
                record_id=record_id, timestamp=timestamp, offset=start, end_offset=end,
                bus=bus, protocol=protocol, length=length,
                context=record_text[lo:hi],
            )
            findings.append(Finding(
                finding_type=rule.finding_type, value=value,
                rule_matched=rule.finding_type, occurrences=[occurrence],
            ))

    return deduplicate_fallbacks(findings)


# ---------------------------------------------------------------------------
# Fallback deduplication
# ---------------------------------------------------------------------------

def deduplicate_fallbacks(findings):
    """Drop a fallback match when a more specific rule already hit the same spot."""
    specific_matches = set()
    for finding in findings:
        if not _is_fallback(finding):
            for occ in finding.occurrences:
                specific_matches.add((occ.record_id, finding.value, occ.offset, occ.end_offset))

    deduplicated = []
    for finding in findings:
        if _is_fallback(finding):
            keep = [o for o in finding.occurrences
                    if (o.record_id, finding.value, o.offset, o.end_offset) not in specific_matches]
            if keep:
                finding.occurrences = keep
                deduplicated.append(finding)
        else:
            deduplicated.append(finding)
    return deduplicated


def _is_fallback(finding: Finding) -> bool:
    return any(r.finding_type == finding.rule_matched and r.is_fallback for r in RULES)


# ---------------------------------------------------------------------------
# Scan Elasticsearch hits
# ---------------------------------------------------------------------------

def scan_es_hits(hits):
    """Scan ES documents and aggregate identical findings by (finding_type, value).

    poc_index stores the bus under `type`; older captures used `bus`. We accept
    either so this works on both shapes.
    """
    raw_findings = []
    for hit in hits:
        source = hit.get("_source", {})
        record_id = hit.get("_id", "")
        # wiresploit-poc1 stores the payload as hex; decode to ASCII to scan it.
        payload_ascii = source.get("payload_ascii") or _hex_to_ascii(source.get("payload_hex"))
        findings = scan_record(
            record_id=record_id,
            record_text=str(payload_ascii or ""),
            timestamp=source.get("timestamp"),
            bus=source.get("event_type"),
            protocol=source.get("protocol"),
            length=source.get("length_bytes"),
        )
        raw_findings.extend(findings)

    grouped = {}
    for finding in raw_findings:
        key = (finding.finding_type, finding.value)
        if key not in grouped:
            grouped[key] = finding
        else:
            grouped[key].occurrences.extend(finding.occurrences)

    return list(grouped.values())
