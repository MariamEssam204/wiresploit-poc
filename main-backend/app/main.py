"""Wiresploit backend — FastAPI app factory.

Local-only, on :8000. Capture/Analysis domain only: capture -> Elasticsearch
(persist) -> SSE stream -> UI; substring-in-payload search via ES.
(routes in app/routes.py, prefix /api)

The Injection domain is a SEPARATE standalone app in ../final-injection-code/,
run on its own port; the frontend proxies /api/injection to it.

Run:  uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config, store
from .routes import router as capture_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Say which auth mode reached this process (never prints the secret itself).
    if config.ES_API_KEY:
        auth = f"api_key ({len(config.ES_API_KEY)} chars)"
    elif config.ES_USER and config.ES_PASSWORD:
        auth = f"basic ({config.ES_USER})"
    else:
        auth = "NONE (anonymous)"
    print(f"[startup] ES {config.ES_URL} index={config.ES_INDEX} auth={auth}")
    try:
        store.ensure_index()
    except Exception as e:  # backend still starts if ES is briefly down
        print("[startup] ES index setup failed:", e)
    # NOTE: the DB tailer is NOT started here — the UI opens idle and the user
    # presses "Start capture" to begin live-tailing (POST /api/capture/start).
    yield


app = FastAPI(title="Wiresploit Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Capture / Analysis domain (/api/health, /api/search, /api/stream, /api/capture/*) ---
app.include_router(capture_router)
