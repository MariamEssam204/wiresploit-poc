import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtClock, tsValue, psfPreview } from '../lib/format.js'
import { searchPackets } from '../api/client.js'
import PacketDetails from './PacketDetails.jsx'
import PayloadView from './HexDump.jsx'

const MAX_ROWS = 1500

export default function LiveTimeline({ packets, selectedId, onSelect, connected }) {
  const [term, setTerm] = useState('')
  const [hidden, setHidden] = useState(() => new Set()) // event_types toggled off
  const [autoScroll, setAutoScroll] = useState(true)
  const [results, setResults] = useState(null) // ES results when searching; null = live view
  const [searching, setSearching] = useState(false)
  const tableWrap = useRef(null)

  // Term present -> substring search in Elasticsearch (payload / protocol / event_type), debounced.
  useEffect(() => {
    const t = term.trim()
    if (!t) { setResults(null); return }
    setSearching(true)
    const h = setTimeout(async () => {
      try { setResults(await searchPackets(t)) } catch { setResults([]) } finally { setSearching(false) }
    }, 200)
    return () => clearTimeout(h)
  }, [term, packets.length])

  const source = results !== null ? results : packets
  // event_type values present, for the filter chips (dynamic — not a fixed list).
  const eventTypes = useMemo(
    () => [...new Set(source.map((p) => p.event_type).filter(Boolean))].sort(),
    [source],
  )
  // Live view: ARRIVAL order — a newly-arrived packet always shows at the bottom,
  // whatever its timestamp (so an insert is never hidden mid-list). Search results
  // stay timestamp-sorted (the DB/search remain the timestamp authority).
  const filtered = useMemo(() => {
    const f = source.filter((p) => !hidden.has(p.event_type))
    return results !== null ? [...f].sort((a, b) => tsValue(a) - tsValue(b)) : f
  }, [source, hidden, results])
  const rows = filtered.slice(-MAX_ROWS)
  const selected =
    source.find((p) => String(p.id) === String(selectedId)) ||
    packets.find((p) => String(p.id) === String(selectedId)) || null

  useEffect(() => {
    if (results === null && autoScroll && tableWrap.current) {
      tableWrap.current.scrollTop = tableWrap.current.scrollHeight
    }
  }, [rows.length, autoScroll, results])

  const toggleType = (t) => {
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  return (
    <div className="view">
      <div className="filterbar">
        <div className="search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder="Search inside payloads (Elasticsearch)… e.g. a credential" />
          {term && <button className="search-clear" onClick={() => setTerm('')} title="Clear">✕</button>}
        </div>
        {eventTypes.map((t) => (
          <button key={t} className={'chip' + (hidden.has(t) ? '' : ' on')} onClick={() => toggleType(t)}>{t}</button>
        ))}
        <label className="match-note" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>
        <span className="match-note">
          {results !== null
            ? `${searching ? '…' : filtered.length} match${filtered.length === 1 ? '' : 'es'} in ES`
            : `${filtered.length.toLocaleString()} live`}
          {' · '}
          <span style={{ color: connected ? 'var(--ok)' : 'var(--err)' }}>{connected ? 'stream ●' : 'stream ○'}</span>
        </span>
      </div>

      <div className="timeline-split">
        <div className="table-wrap" ref={tableWrap}>
          <table className="pkt">
            <thead>
              <tr>
                <th>No.</th><th>Timestamp</th><th>Event</th><th>Protocol</th>
                <th>Dur</th><th>Len</th><th>PSF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}
                  className={(String(p.id) === String(selectedId) ? 'sel' : '') + (p.__live ? ' row-new' : '')}
                  onClick={() => onSelect(p.id)}>
                  <td>{p.id}</td>
                  <td>{fmtClock(p.timestamp)}</td>
                  <td>
                    {p.malformed && <span className="malformed" title="payload_hex missing/invalid">⚠</span>}
                    <span className={'badge ' + (p.event_type || '')}>{p.event_type}</span>
                  </td>
                  <td>{p.protocol}</td>
                  <td>{p.duration ?? ''}</td>
                  <td>{p.length_bytes ?? ''}</td>
                  <td className="psf-cell" title={JSON.stringify(p.psf)}>{psfPreview(p.psf)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-hint">
                    {results !== null
                      ? (searching ? 'Searching Elasticsearch…' : 'No packets match — try another substring.')
                      : 'Press START CAPTURE to begin listening. New events that land in the database will appear here as they arrive.'}
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="detail-row">
          <div className="detail-panel">
            <div className="pane-title">Packet Details</div>
            <PacketDetails packet={selected} />
          </div>
          <div className="hex-panel">
            <div className="pane-title">Payload</div>
            <PayloadView packet={selected} highlight={term} />
          </div>
        </div>
      </div>
    </div>
  )
}
