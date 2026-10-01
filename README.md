# Wiresploit POC — Containerized Deployment 

Self-contained snapshot of the Wiresploit poc, packaged into three Docker
services. 

## Services

| Service | Port | What it is | Image base |
|---|---|---|---|
| `frontend` | **5173** → 80 | React app (built) served by nginx | `nginx:alpine` |
| `main-backend` | 8000 | Capture / live timeline / search / findings / context analysis | `python:3.13-slim` |
| `injection-backend` | 8100 | Drives the Raspberry Pi injection node | `python:3.13-slim` |


## Prerequisites

1. **Docker + Docker Compose** on the host.
2. **Tailscale up on the host** — the backends must reach your Elasticsearch
   and, for injection, your Raspberry Pi node (port `9000`).
3. An **Elasticsearch API key**
   `wiresploit-poc1`.

## Setup

```bash
git clone https://github.com/MariamEssam204/wiresploit-poc.git
cd wiresploit-poc
cp .env.example .env
# edit .env and paste your WIRESPLOIT_ES_API_KEY
```

`.env` is gitignored and injected at **runtime**.

## Run

```bash
docker compose up --build
```

Then open **http://localhost:5173**.


## Using it

1. In the **Live View**, press **Start Capture** — the DB only stores packets
   while capturing, and injection is only enabled while capturing.
2. For injection, open the **Injection** tab, configure the Pi node
   (its address — a Tailscale hostname or IP — and port `9000`), pick a **Pi** interface,
   and run a test. The injection event is stored as a packet and appears in the
   timeline.

## How it connects out

- **Elasticsearch:** `main-backend` reads `WIRESPLOIT_ES_URL` + the API key from
  `.env` at runtime.
- **Raspberry Pi:** `injection-backend` reaches the Pi over the network; you set
  the node address in the UI.
- **Injection → timeline:** `injection-backend` forwards events to
  `http://main-backend:8000/api/capture/ingest` (preset in `docker-compose.yml`).

## Networking note (Tailscale)

With Docker's default bridge network, container traffic routes out through the
host, so if the host has Tailscale up the backends can reach the ES and Pi
Tailscale IPs.

## What is intentionally NOT included 

- `pi-node/` and `injection-node/` — these run **on the Raspberry Pi**, not the PC.