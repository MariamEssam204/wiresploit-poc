"""Backend configuration (env-overridable)."""
import os

# Secrets file kept OUTSIDE the project folder so it can never be committed.
# Lines are KEY=VALUE; a real (non-empty) environment variable always wins.
ENV_FILE = os.path.expanduser(
    os.environ.get("WIRESPLOIT_ENV_FILE", "~/.config/wiresploit/backend.env")
)


def _load_env_file(path: str) -> None:
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                if not os.environ.get(key):
                    os.environ[key] = value.strip()
    except FileNotFoundError:
        pass


_load_env_file(ENV_FILE)

# Elasticsearch
ES_URL = os.environ.get("WIRESPLOIT_ES_URL", "http://100.95.111.97:9200")
ES_INDEX = os.environ.get("WIRESPLOIT_ES_INDEX", "wiresploit-poc1")
# The new DB is security-enabled. Supply EITHER an API key OR basic-auth creds
# via env (never commit secrets). If none are set, the client connects anonymously.
# Tolerate common paste mistakes: surrounding whitespace or quotes.
ES_API_KEY = (os.environ.get("WIRESPLOIT_ES_API_KEY") or "").strip().strip("\"'") or None
ES_USER = os.environ.get("WIRESPLOIT_ES_USER") or None
ES_PASSWORD = os.environ.get("WIRESPLOIT_ES_PASSWORD") or None
# Skip TLS cert verification if the cluster uses a self-signed cert (https).
ES_VERIFY_CERTS = os.environ.get("WIRESPLOIT_ES_VERIFY_CERTS", "1") not in ("0", "false", "False")

# CORS — the Vite dev server origin(s)
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Capture
DUT_ID = "DUT-POC-0001"

# Live timeline: the backend tails poc_index and pushes any newly-inserted
# document to the UI. This is how often it polls Elasticsearch for new docs.
TAIL_INTERVAL_SEC = float(os.environ.get("WIRESPLOIT_TAIL_INTERVAL", "1.0"))
# How many recent packets the timeline loads from ES when it first opens.
RECENT_LIMIT = int(os.environ.get("WIRESPLOIT_RECENT_LIMIT", "500"))
