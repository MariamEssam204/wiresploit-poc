import { useCallback, useEffect, useRef, useState } from 'react'
import { openStream, startCapture as apiStart, stopCapture as apiStop } from '../api/client.js'

// Live timeline state. This is a LIVE FEED, not a dashboard: it does NOT load or
// show what is already in the database. The timeline starts EMPTY. Pressing
// "Start capture" tells the backend to begin listening for NEW documents landing
// in the DB and push them over SSE; each one is appended here as it arrives, in
// arrival order. "Stop capture" stops the listening. Nothing is shown until you
// press Start, and only events that arrive while capturing appear.
export function useCapture() {
  const [packets, setPackets] = useState([])
  const [capturing, setCapturing] = useState(false) // opens idle; user presses Start
  const [connected, setConnected] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  const esRef = useRef(null)
  const firstTs = useRef(null)
  const clockTimer = useRef(null)
  const seen = useRef(new Set()) // ids already appended — avoids any accidental dupes

  const addPackets = useCallback((incoming) => {
    // Dedup OUTSIDE the state updater — the updater must be pure, or React
    // StrictMode's double-invoke would mark the id seen on the first call and
    // drop the packet on the second (nothing would render).
    const fresh = incoming.filter((p) => !seen.current.has(String(p.id)))
    if (fresh.length === 0) return
    fresh.forEach((p) => seen.current.add(String(p.id)))
    const tagged = fresh.map((p) => ({ ...p, __live: true })) // flash newly-arrived rows
    setPackets((prev) => [...prev, ...tagged])
  }, [])

  // A document was deleted from the DB while capturing -> drop it from the feed.
  const removePacket = useCallback((id) => {
    const key = String(id)
    seen.current.delete(key)
    setPackets((prev) => prev.filter((p) => String(p.id) !== key))
    setSelectedId((sel) => (String(sel) === key ? null : sel))
  }, [])

  // Open the SSE stream, but stay EMPTY — no DB pre-load. The backend only pushes
  // while capturing, so nothing arrives until the user presses Start capture.
  useEffect(() => {
    const es = openStream({
      onOpen: () => setConnected(true),
      onError: () => setConnected(false),
      onPacket: (pkt) => addPackets([pkt]),
      onRemove: (id) => removePacket(id),
    })
    esRef.current = es
    return () => es.close()
  }, [addPackets, removePacket])

  // Session clock: runs while capturing.
  useEffect(() => {
    if (!capturing) return
    if (firstTs.current === null) firstTs.current = Date.now()
    clockTimer.current = setInterval(() => {
      if (firstTs.current) setElapsed(Date.now() - firstTs.current)
    }, 1000)
    return () => clearInterval(clockTimer.current)
  }, [capturing])

  const start = useCallback(async () => {
    await apiStart()
    setCapturing(true)
  }, [])

  const stop = useCallback(async () => {
    await apiStop()
    setCapturing(false)
  }, [])

  // Clear only the local display buffer (ES retains the full session).
  const clear = useCallback(() => {
    setPackets([])
    setSelectedId(null)
    seen.current.clear()
    firstTs.current = null
    setElapsed(0)
  }, [])

  return { packets, capturing, connected, selectedId, setSelectedId, elapsed, start, stop, clear }
}
