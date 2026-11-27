/**
 * Module: LiveTimeline
 * Purpose: Live timeline view: filter bar, packet table, and the details
 *          and payload panes for the selected packet.
 * Owner: Full Stack team
 */
import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../app/AppContext.jsx'
import { readMatchingPackets } from '../../api/client.js'
import { getTimestampMs } from '../../lib/format.js'
import FilterBar from './FilterBar.jsx'
import PacketTable from './PacketTable.jsx'
import PacketDetails from './PacketDetails.jsx'
import PayloadView from './PayloadView.jsx'
import './timeline.css'

const MAX_VISIBLE_ROWS = 1500
const SEARCH_DEBOUNCE_MS = 200

function isSamePacketId(left, right) {
  return String(left) === String(right)
}

export default function LiveTimeline() {
  const { capture } = useAppContext()
  const { packets, isConnected, selectedPacketId, selectPacket } = capture

  const [searchTerm, setSearchTerm] = useState('')
  const [hiddenEventTypes, setHiddenEventTypes] = useState(() => new Set())
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  // Elasticsearch results while a search term is set; null means live view.
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  // A search term switches to a debounced substring search in Elasticsearch
  // (payload / protocol / event_type).
  useEffect(() => {
    const trimmedTerm = searchTerm.trim()
    if (!trimmedTerm) {
      setSearchResults(null)
      setSearchError(null)
      return undefined
    }
    setIsSearching(true)
    const debounceTimer = setTimeout(async () => {
      try {
        setSearchResults(await readMatchingPackets(trimmedTerm))
        setSearchError(null)
      } catch (error) {
        setSearchResults([])
        setSearchError(String(error.message || error))
      } finally {
        setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, packets.length])

  const isSearchMode = searchResults !== null
  const sourcePackets = isSearchMode ? searchResults : packets

  // event_type values present, for the filter chips (dynamic, not a fixed list).
  const eventTypes = useMemo(
    () => [...new Set(sourcePackets.map((packet) => packet.event_type).filter(Boolean))].sort(),
    [sourcePackets],
  )

  // Live view keeps ARRIVAL order, so a new packet always shows at the bottom
  // whatever its timestamp. Search results are timestamp-sorted, because the
  // database stays the timestamp authority.
  const visiblePackets = useMemo(() => {
    const filtered = sourcePackets.filter((packet) => !hiddenEventTypes.has(packet.event_type))
    if (!isSearchMode) return filtered
    return [...filtered].sort((left, right) => getTimestampMs(left) - getTimestampMs(right))
  }, [sourcePackets, hiddenEventTypes, isSearchMode])

  const tableRows = visiblePackets.slice(-MAX_VISIBLE_ROWS)
  const selectedPacket =
    sourcePackets.find((packet) => isSamePacketId(packet.id, selectedPacketId)) ||
    packets.find((packet) => isSamePacketId(packet.id, selectedPacketId)) ||
    null

  const toggleEventType = (eventType) => {
    setHiddenEventTypes((previous) => {
      const next = new Set(previous)
      if (next.has(eventType)) next.delete(eventType)
      else next.add(eventType)
      return next
    })
  }

  return (
    <div className="view">
      <FilterBar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        eventTypes={eventTypes}
        hiddenEventTypes={hiddenEventTypes}
        onToggleEventType={toggleEventType}
        shouldAutoScroll={shouldAutoScroll}
        onAutoScrollChange={setShouldAutoScroll}
        isSearchMode={isSearchMode}
        isSearching={isSearching}
        matchCount={visiblePackets.length}
        isConnected={isConnected}
      />

      <div className="timeline-split">
        <PacketTable
          rows={tableRows}
          selectedPacketId={selectedPacketId}
          onSelectPacket={selectPacket}
          shouldAutoScroll={shouldAutoScroll && !isSearchMode}
          emptyMessage={buildEmptyMessage(isSearchMode, isSearching, searchError)}
        />

        <div className="timeline-detail-row">
          <section className="timeline-pane">
            <div className="pane-title">Packet details</div>
            <PacketDetails packet={selectedPacket} />
          </section>
          <section className="timeline-pane">
            <div className="pane-title">Payload</div>
            <PayloadView packet={selectedPacket} highlightTerm={searchTerm} />
          </section>
        </div>
      </div>
    </div>
  )
}

function buildEmptyMessage(isSearchMode, isSearching, searchError) {
  if (!isSearchMode) {
    return 'Press Start capture to begin listening. New events stored in the database appear here as they arrive.'
  }
  if (searchError) return `Search failed: ${searchError}`
  if (isSearching) return 'Searching Elasticsearch…'
  return 'No packets match. Try another substring.'
}
