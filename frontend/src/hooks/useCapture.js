/**
 * Module: useCapture
 * Purpose: Live capture state for the whole app: the packet feed, capture
 *          on/off, stream connection, selection and the session clock.
 * Owner: Full Stack team
 *
 * This is a LIVE FEED, not a dashboard: it does not load what is already in
 * the database. The feed starts empty. Start capture tells the Backend to
 * push NEW documents over SSE; each is appended in arrival order. Stop
 * capture ends that. Clear only empties the local display buffer;
 * Elasticsearch keeps the full session.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { sendCaptureStart, sendCaptureStop, startPacketStream } from '../api/client.js'

const CLOCK_TICK_MS = 1000

/**
 * @returns {{
 *   packets: object[], isCapturing: boolean, isConnected: boolean,
 *   captureError: string | null, selectedPacketId: string | null,
 *   selectPacket: (packetId: string | null) => void, elapsedMs: number,
 *   startCapture: () => Promise<void>, stopCapture: () => Promise<void>,
 *   clearPackets: () => void
 * }}
 */
export function useCapture() {
  const [packets, setPackets] = useState([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [captureError, setCaptureError] = useState(null)
  const [selectedPacketId, setSelectedPacketId] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  const sessionStartMs = useRef(null)
  const clockTimer = useRef(null)
  // Ids already appended, so a repeated frame never creates a duplicate row.
  const seenPacketIds = useRef(new Set())

  const appendPackets = useCallback((incomingPackets) => {
    // Dedup OUTSIDE the state updater: the updater must be pure, or React
    // StrictMode's double-invoke would mark the id seen on the first call and
    // drop the packet on the second (nothing would render).
    const freshPackets = incomingPackets.filter(
      (packet) => !seenPacketIds.current.has(String(packet.id)),
    )
    if (freshPackets.length === 0) return
    freshPackets.forEach((packet) => seenPacketIds.current.add(String(packet.id)))
    // isLive makes the table flash newly arrived rows.
    const taggedPackets = freshPackets.map((packet) => ({ ...packet, isLive: true }))
    setPackets((previous) => [...previous, ...taggedPackets])
  }, [])

  // A document was deleted from the database while capturing: drop it.
  const removePacket = useCallback((packetId) => {
    const key = String(packetId)
    seenPacketIds.current.delete(key)
    setPackets((previous) => previous.filter((packet) => String(packet.id) !== key))
    setSelectedPacketId((selected) => (String(selected) === key ? null : selected))
  }, [])

  // Open the stream once. The Backend only pushes while capturing, so nothing
  // arrives until the user presses Start capture.
  useEffect(() => {
    const eventSource = startPacketStream({
      onOpen: () => setIsConnected(true),
      onError: () => setIsConnected(false),
      onPacket: (packet) => appendPackets([packet]),
      onRemove: removePacket,
    })
    return () => eventSource.close()
  }, [appendPackets, removePacket])

  // Session clock: ticks while capturing.
  useEffect(() => {
    if (!isCapturing) return undefined
    if (sessionStartMs.current === null) sessionStartMs.current = Date.now()
    clockTimer.current = setInterval(() => {
      setElapsedMs(Date.now() - sessionStartMs.current)
    }, CLOCK_TICK_MS)
    return () => clearInterval(clockTimer.current)
  }, [isCapturing])

  const startCapture = useCallback(async () => {
    setCaptureError(null)
    try {
      await sendCaptureStart()
      setIsCapturing(true)
    } catch (error) {
      setCaptureError(String(error.message || error))
    }
  }, [])

  const stopCapture = useCallback(async () => {
    setCaptureError(null)
    try {
      await sendCaptureStop()
      setIsCapturing(false)
    } catch (error) {
      setCaptureError(String(error.message || error))
    }
  }, [])

  const clearPackets = useCallback(() => {
    setPackets([])
    setSelectedPacketId(null)
    seenPacketIds.current.clear()
    sessionStartMs.current = null
    setElapsedMs(0)
  }, [])

  return {
    packets,
    isCapturing,
    isConnected,
    captureError,
    selectedPacketId,
    selectPacket: setSelectedPacketId,
    elapsedMs,
    startCapture,
    stopCapture,
    clearPackets,
  }
}
