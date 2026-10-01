# Wiresploit — PoC

A local security-analysis app for an arbitrary **Device Under Test (DUT)**. It
captures a DUT's communications into Elasticsearch, shows a live packet-by-packet
timeline, runs analysis engines over the data, and drives active **injection**
tests through a Raspberry Pi node.

This repository is the **containerized, ready-to-run build** — three Docker
services that build and run with one command.

---

## Features

- **Live timeline** — real-time packet/event feed over SSE; substring search inside payloads.
- **Analysis engines** — **Findings** (pattern/credential leak detection) and **Context Analysis** (behaviour / activity-cluster diagram).
- **Injection** — controlled TCP/UDP/ICMP and UART tests executed on a Raspberry Pi node; results are stored as packets and shown on the timeline.
- **Capture-gated storage** — the database only records packets while capture is running.

## Architecture

```
          browser  ──▶  frontend (nginx, :5173)
                           │   /api/injection/*  ──▶  injection-backend (:8100) ──▶ Raspberry Pi node
                           └── /api/*            ──▶  main-backend (:8000) ──▶ Elasticsearch
```

| Service | Port | Role |
|---|---|---|
| `frontend` | **5173** | React app (built), served by nginx; reverse-proxies the APIs |
| `main-backend` | 8000 | Capture, live timeline, search, findings, context analysis (talks to Elasticsearch) |
| `injection-backend` | 8100 | Drives the Raspberry Pi injection node; forwards injection events to the main backend |

Elasticsearch is **not** bundled — the app connects to an existing cluster (see below).

---

## Prerequisites

1. **Docker** + **Docker Compose**.
2. Access to an **Elasticsearch** cluster with an index named `wiresploit-poc1`
   (mapping below), and an **API key** that can read/write it.
3. Network reachability to that cluster (in the reference setup it's reached over
   [Tailscale](https://tailscale.com/)).
4. *(Optional, for injection)* a Raspberry Pi running the injection node.

## Quick start

```bash
git clone https://github.com/<your-username>/wiresploit-poc.git
cd wiresploit-poc

cp .env.example .env         # then edit .env and add your ES API key
docker compose up --build
```

Open **http://localhost:5173**.

## Configuration (`.env`)

Copy `.env.example` → `.env` and fill in:

```ini
WIRESPLOIT_ES_URL=http://<your-es-host>:9200
WIRESPLOIT_ES_INDEX=wiresploit-poc1
WIRESPLOIT_ES_API_KEY=<the base64 "encoded" API key>
WIRESPLOIT_ES_VERIFY_CERTS=0        # 0 for plain HTTP, 1 for HTTPS with valid certs
```

`.env` is gitignored and injected at runtime — **no secret is committed or baked
into the image.** Use a scoped API key (e.g. `all` on `wiresploit-*`); do not use
a superuser key.

### Elasticsearch index mapping

If the index doesn't exist yet, create it:

```json
PUT /wiresploit-poc1
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "timestamp":    { "type": "date_nanos" },
      "event_type":   { "type": "keyword" },
      "protocol":     { "type": "keyword" },
      "duration":     { "type": "long" },
      "length_bytes": { "type": "long" },
      "payload_hex":  { "type": "wildcard" },
      "psf":          { "type": "flattened", "depth_limit": 50, "ignore_above": 8191 }
    }
  }
}
```

## Using it

1. Open **Live View** and press **Start Capture** — the timeline begins showing new
   events, and the database starts recording (nothing is stored while stopped).
2. For injection, open the **Injection** tab, configure the Raspberry Pi node
   (its address + port `9000`), pick one of the **Pi's** interfaces (e.g. `eth0`),
   and run a test. The event is stored and appears on the timeline.
   Injection is only enabled while capturing.

## Project structure

```
.
├── docker-compose.yml       # orchestrates the three services
├── .env.example             # configuration template
├── frontend/                # React app + nginx config
├── main-backend/            # capture / timeline / findings / context analysis
└── injection-backend/       # Pi node driver + event forwarder
```

## Notes & limitations

- **It needs a reachable Elasticsearch.** With no reachable cluster, the app
  starts but the timeline/search/analysis are empty. Point `WIRESPLOIT_ES_URL` at
  your own cluster (and create the index above) to run standalone.
- **Injection needs a Raspberry Pi node** reachable from the injection backend;
  the selected interface must be one that exists **on the Pi**.
- **Networking:** with Docker's default bridge, containers route out through the
  host — if the host is on the same network/VPN as the cluster and Pi, it works.
  Otherwise add `network_mode: host` to the two backends (Linux).

## Configuration reference

| Variable | Default | Meaning |
|---|---|---|
| `WIRESPLOIT_ES_URL` | `http://100.95.111.97:9200` | Elasticsearch REST endpoint |
| `WIRESPLOIT_ES_INDEX` | `wiresploit-poc1` | Index name |
| `WIRESPLOIT_ES_API_KEY` | *(empty)* | Base64 `encoded` API key |
| `WIRESPLOIT_ES_USER` / `WIRESPLOIT_ES_PASSWORD` | *(empty)* | Basic-auth alternative to the API key |
| `WIRESPLOIT_ES_VERIFY_CERTS` | `0` | Verify TLS certs (for HTTPS) |
