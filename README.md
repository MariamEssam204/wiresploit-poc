# Wiresploit — Containerized Deployment (`deploy/`)

Self-contained snapshot of the Wiresploit app, packaged into three Docker
services. This is the **lean** build: it ships the running app (including the
native **Context Analysis / behaviour diagram** and **Findings** engines) but
**not** the standalone PoC folders or the Raspberry Pi node code.

It connects to your **existing** Elasticsearch — no database is bundled here.

## Services

| Service | Port | What it is | Image base |
|---|---|---|---|
| `frontend` | **5173** → 80 | React app (built) served by nginx, which reverse-proxies the APIs | `nginx:alpine` |
| `main-backend` | 8000 | Capture / live timeline / search / findings / context analysis (talks to ES) | `python:3.13-slim` |
| `injection-backend` | 8100 | Drives the Raspberry Pi injection node; forwards injection events to the main backend | `python:3.13-slim` |

The browser only ever talks to the **frontend** (`:5173`). nginx routes:
- `/api/injection/*` → `injection-backend:8100`
- `/api/*` (everything else, incl. the SSE stream) → `main-backend:8000`

## Prerequisites

1. **Docker + Docker Compose** on the host.
2. **Tailscale up on the host** — the backends must reach your Elasticsearch
   (`100.95.111.97:9200`) and, for injection, the Pi (`100.121.81.91:9000`).
3. An **Elasticsearch API key** (or basic-auth creds) that can read/write
   `wiresploit-poc1`.

## Setup

```bash
cd deploy
cp .env.example .env
# edit .env and paste your WIRESPLOIT_ES_API_KEY (or set USER/PASSWORD)
```

`.env` is gitignored and injected at **runtime** — no secret is baked into any image.

## Run

```bash
docker compose up --build
```

Then open **http://localhost:5173**.

To stop: `Ctrl-C`, or `docker compose down`.

## Using it

1. In the **Live View**, press **Start Capture** — the DB only stores packets
   while capturing, and injection is only enabled while capturing.
2. For injection, open the **Injection** tab, configure the Pi node
   (address `100.121.81.91`, port `9000`), pick a **Pi** interface (e.g. `eth0`),
   and run a test. The injection event is stored as a packet and appears in the
   timeline.

## How it connects out

- **Elasticsearch:** `main-backend` reads `WIRESPLOIT_ES_URL` + the API key from
  `.env` at runtime.
- **Raspberry Pi:** `injection-backend` reaches the Pi over the network; you set
  the node address in the UI (not baked in).
- **Injection → timeline:** `injection-backend` forwards events to
  `http://main-backend:8000/api/capture/ingest` (preset in `docker-compose.yml`).

## Networking note (Tailscale)

With Docker's default bridge network, container traffic routes out through the
host, so if the host has Tailscale up the backends can reach the ES and Pi
Tailscale IPs. If they **can't** reach them from inside the containers, add
`network_mode: host` to `main-backend` and `injection-backend` in
`docker-compose.yml` (Linux only — note the nginx `proxy_pass` targets would
then need to be `localhost:8000` / `localhost:8100`).

## Updating the code

This folder is a **snapshot** copied from the source tree
(`backend/`, `final-injection-code/backend/`, `frontend/` +
`final-injection-code/frontend/src`). If you change the source, re-copy the
relevant parts here and rebuild. The only local edit made during packaging is in
`frontend/src/components/Injection.jsx`, whose import points at
`../../injection-ui/...` (the in-folder copy of the injection UI) instead of the
original cross-folder path.

## What is intentionally NOT included (lean build)

- `pi-node/` and `injection-node/` — these run **on the Raspberry Pi**, not the PC.
- `wiresploit-network-injection/` — old reference copy.
