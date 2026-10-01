"""
Simple local JSON audit log.

Writes one JSON array file under the user's Downloads directory.
No database is used for v0. Only non-sensitive metadata is stored
(no raw payload bytes beyond a short preview and length).
"""

from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

_lock = threading.Lock()


def _log_path() -> Path:
    downloads = Path(os.path.expanduser("~")) / "Downloads"
    audit_dir = downloads / "wiresploit" / "audit"
    audit_dir.mkdir(parents=True, exist_ok=True)
    return audit_dir / "injection_log.json"


def append_entry(entry: dict[str, Any]) -> None:
    path = _log_path()
    with _lock:
        entries = []
        if path.exists():
            try:
                entries = json.loads(path.read_text() or "[]")
            except json.JSONDecodeError:
                entries = []
        entries.append(entry)
        path.write_text(json.dumps(entries, indent=2))


def read_all() -> list[dict[str, Any]]:
    path = _log_path()
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text() or "[]")
    except json.JSONDecodeError:
        return []
