// Thin client for the FastAPI backend (proxied at /api by Vite).
const BASE = '/api'

export async function startCapture() {
  await fetch(`${BASE}/capture/start`, { method: 'POST' })
}

export async function stopCapture() {
  await fetch(`${BASE}/capture/stop`, { method: 'POST' })
}

// Recent packets straight from Elasticsearch — the timeline's initial fill.
export async function getRecentPackets(limit = 500) {
  const res = await fetch(`${BASE}/packets?limit=${limit}`)
  if (!res.ok) throw new Error(`packets failed: ${res.status}`)
  const data = await res.json()
  return data.packets || []
}

// Run the scan engine over poc_index and return aggregated findings.
export async function getFindings() {
  const res = await fetch(`${BASE}/findings`)
  if (!res.ok) throw new Error(`findings failed: ${res.status}`)
  return res.json() // { findings, packets_scanned, rules_loaded }
}

// Context Analysis engine: ordered events plus the correlated activities each
// one belongs to. The UI draws the behavior diagram from this.
export async function getContextAnalysis(limit = 10000) {
  const res = await fetch(`${BASE}/context-analysis?limit=${limit}`)
  if (!res.ok) throw new Error(`context analysis failed: ${res.status}`)
  return res.json() // { events, activities, endpoints, protocols, stats, error }
}

// Substring-in-payload search, executed server-side against Elasticsearch.
export async function searchPackets(q) {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`search failed: ${res.status}`)
  const data = await res.json()
  return data.results || []
}

// Open the live SSE mirror of the DB. `packet` = a doc was added, `removed` =
// a doc was deleted. Returns the EventSource so the caller can close it.
export function openStream({ onPacket, onRemove, onOpen, onError }) {
  const es = new EventSource(`${BASE}/stream`)
  es.addEventListener('ready', () => onOpen && onOpen())
  es.addEventListener('packet', (e) => {
    try {
      onPacket(JSON.parse(e.data))
    } catch {
      /* ignore malformed frame */
    }
  })
  es.addEventListener('removed', (e) => {
    try {
      onRemove && onRemove(JSON.parse(e.data).id)
    } catch {
      /* ignore malformed frame */
    }
  })
  es.onerror = (e) => onError && onError(e)
  return es
}
