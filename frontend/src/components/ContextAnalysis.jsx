import { useCallback, useEffect, useMemo, useState } from 'react'
import { getContextAnalysis } from '../api/client.js'

// Behavior / context sequence diagram. Endpoints are lifelines, each captured
// event is an arrow between two of them in capture order, and correlated
// activities are the dashed boxes spanning the events they contain.
//
// Layout is computed here rather than server-side so the backend stays a pure
// analysis engine emitting data (see backend/app/context_analysis.py).

const LAYOUT = {
  gutter: 96,          // space kept clear either side so edge chips never clip
  maxColSpacing: 260,  // stops 2-3 endpoints from stretching absurdly wide
  staggerBelow: 118,   // tighter than this and chips alternate over two rows
  chipMaxWidth: 176,
  chipHeight: 32,
  chipTop: 16,
  staggerOffset: 40,
  rowHeight: 62,
  groupPadding: 18,
  groupLabelHeight: 26,
  selfLoopWidth: 55,
  selfLoopDrop: 32,
  charWidth: 6.6,      // ~1 char of the 12px mono face, for fitting labels
}


// Mirrors the protocol colors in index.css. Kept as literals because SVG paint
// attributes and <marker> fills resolve more reliably than var() references.
const PROTOCOL_COLORS = {
  UART: '#22d3ee',
  SPI: '#c4a2fc',
  I2C: '#fbbf24',
  TCP: '#fb7185',
  UDP: '#fb923c',
  DNS: '#38bdf8',
  ICMP: '#94a1bd',
  ARP: '#a78bfa',
}

// Dark-theme activity tints: translucent fill, bright stroke, readable label.
const ACTIVITY_COLORS = [
  { fill: '#101a33', stroke: '#3b82f6', text: '#93b4fc' },
  { fill: '#1a1535', stroke: '#a78bfa', text: '#c4b5fd' },
  { fill: '#0c2620', stroke: '#34d399', text: '#6ee7b7' },
  { fill: '#2a1a0d', stroke: '#fb923c', text: '#fdba74' },
  { fill: '#2b1220', stroke: '#fb7185', text: '#fda4af' },
  { fill: '#0c2430', stroke: '#22d3ee', text: '#67e8f9' },
  { fill: '#26102b', stroke: '#e879f9', text: '#f0abfc' },
  { fill: '#2a2110', stroke: '#fbbf24', text: '#fcd34d' },
]

function protocolColor(protocol) {
  const key = String(protocol || '').toUpperCase()
  if (PROTOCOL_COLORS[key]) return PROTOCOL_COLORS[key]
  // Stable hue for anything the palette doesn't name.
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return `hsl(${Math.abs(hash) % 360} 55% 62%)`
}

// SVG text has no ellipsis, so labels are truncated to the width available.
// The full value always stays reachable through a <title> tooltip.
function fitText(text, maxWidth) {
  const budget = Math.floor(maxWidth / LAYOUT.charWidth)
  if (budget >= text.length) return text
  return budget > 1 ? text.slice(0, budget - 1) + '\u2026' : ''
}

function activityColor(cluster) {
  return ACTIVITY_COLORS[cluster % ACTIVITY_COLORS.length]
}

function fmtDuration(seconds) {
  const n = Number(seconds)
  if (!Number.isFinite(n)) return '—'
  if (n < 1) return `${(n * 1000).toFixed(0)} ms`
  if (n < 120) return `${n.toFixed(3)} s`
  const minutes = n / 60
  return minutes < 120 ? `${minutes.toFixed(1)} min` : `${(minutes / 60).toFixed(1)} h`
}

function fmtRel(seconds) {
  return `${Number(seconds).toFixed(3)}s`
}

function fmtClock(ts) {
  const d = new Date(Number(ts) * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// Endpoint columns, one row per event, and the box bounds of each activity.
//
// Horizontal geometry is derived from the width actually available, so the
// diagram always fits its container: columns compress instead of overflowing,
// and nothing ever scrolls sideways. Text is never scaled — it stays at its
// CSS size and is truncated when a column gets too narrow, because a
// viewBox-scaled diagram would shrink labels into illegibility.
function buildLayout(data, viewWidth) {
  if (!data || !data.events.length || viewWidth <= 0) return null
  const { events, endpoints, activities } = data

  const columns = Math.max(endpoints.length - 1, 0)
  const usable = Math.max(viewWidth - LAYOUT.gutter * 2, 120)
  const colSpacing = columns ? Math.min(LAYOUT.maxColSpacing, usable / columns) : 0

  // When the cap kicks in (few endpoints) centre the block rather than
  // leaving all the slack on the right.
  const originX = LAYOUT.gutter + Math.max(usable - colSpacing * columns, 0) / 2

  // Alternating two rows doubles the width each chip can use, which is what
  // keeps full IP addresses readable at tight spacings.
  const stagger = columns > 0 && colSpacing < LAYOUT.staggerBelow
  const chipWidth = Math.max(
    44,
    Math.min(LAYOUT.chipMaxWidth, (stagger ? colSpacing * 2 : colSpacing) - 12),
  )

  const chipTopFor = (i) =>
    LAYOUT.chipTop + (stagger && i % 2 ? LAYOUT.staggerOffset : 0)
  const headerBottom =
    LAYOUT.chipTop + (stagger ? LAYOUT.staggerOffset : 0) + LAYOUT.chipHeight
  const firstRowY = headerBottom + 64

  const lifelines = endpoints.map((endpoint, i) => {
    const chipTop = chipTopFor(i)
    return {
      endpoint,
      x: originX + i * colSpacing,
      chipTop,
      lifelineTop: chipTop + LAYOUT.chipHeight + 6,
      label: fitText(endpoint, chipWidth - 12),
      truncated: fitText(endpoint, chipWidth - 12) !== endpoint,
    }
  })

  const x = {}
  lifelines.forEach((lifeline) => { x[lifeline.endpoint] = lifeline.x })

  const rows = events.map((event, i) => {
    const fromX = x[event.source] ?? originX
    const toX = x[event.destination] ?? originX
    const selfMessage = fromX === toX
    return {
      event,
      y: firstRowY + i * LAYOUT.rowHeight,
      fromX,
      toX,
      selfMessage,
      // Room for the arrow's own caption: the span it crosses, or the gap to
      // the right of a self-loop.
      labelMax: selfMessage ? colSpacing - 12 : Math.abs(toX - fromX) - 18,
    }
  })

  const bounds = new Map()
  rows.forEach(({ event, y }) => {
    const found = bounds.get(event.cluster)
    if (!found) bounds.set(event.cluster, { top: y, bottom: y })
    else found.bottom = y
  })

  const groups = activities.map((activity) => {
    const box = bounds.get(activity.cluster)
    const top = box.top - LAYOUT.groupPadding
    return {
      activity,
      y: top,
      height: box.bottom + LAYOUT.groupPadding - top + LAYOUT.groupLabelHeight,
    }
  })

  return {
    lifelines,
    rows,
    groups,
    chipWidth,
    width: viewWidth,
    height: firstRowY + rows.length * LAYOUT.rowHeight + 60,
  }
}

// Tracks the content-box width of an element, and hands back the element too.
//
// Deliberately a CALLBACK ref held in state, not a useRef: the canvas only
// mounts once the analysis has loaded, so a ref-plus-mount-effect would look at
// a null node, bail out, and never re-run — leaving the width at 0 and the
// diagram permanently blank. Keying the effect on the element makes it attach
// whenever the node actually appears.
//
// A ResizeObserver covers window resizes and browser zoom alike, since both
// change the element's CSS width, and it fires once on observe() to seed it.
function useMeasuredWidth() {
  const [element, setElement] = useState(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, width, element]
}

export default function ContextAnalysis({ onGotoPacket }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selection, setSelection] = useState(null) // {kind:'event'|'activity', id}
  const [tab, setTab] = useState('details')
  const [panelOpen, setPanelOpen] = useState(false)
  const [canvasRef, canvasWidth, canvasEl] = useMeasuredWidth()

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getContextAnalysis()
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setData(d)
        setSelection(null)
      })
      .catch((e) => setError(String(e.message || e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Escape closes the panel, matching the rest of the app's overlays.
  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setPanelOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const layout = useMemo(() => buildLayout(data, canvasWidth), [data, canvasWidth])

  const eventsById = useMemo(() => {
    const map = new Map()
    data?.events.forEach((event) => map.set(event.event_id, event))
    return map
  }, [data])

  const activitiesByCluster = useMemo(() => {
    const map = new Map()
    data?.activities.forEach((activity) => map.set(activity.cluster, activity))
    return map
  }, [data])

  const showEvent = useCallback((eventId) => {
    setSelection({ kind: 'event', id: eventId })
    setTab('details')
    setPanelOpen(true)
  }, [])

  // Selecting an activity also scrolls the diagram to it — the canvas can be
  // tens of thousands of pixels tall, so the box is rarely already in view.
  const showActivity = useCallback((cluster) => {
    setSelection({ kind: 'activity', id: cluster })
    setTab('details')
    setPanelOpen(true)
    const group = layout?.groups.find((g) => g.activity.cluster === cluster)
    if (group && canvasEl) {
      canvasEl.scrollTo({ top: Math.max(group.y - 40, 0), behavior: 'smooth' })
    }
  }, [layout, canvasEl])

  const highlighted = selection?.kind === 'activity' ? selection.id : null
  const selectedEvent = selection?.kind === 'event' ? eventsById.get(selection.id) : null
  const selectedActivity =
    selection?.kind === 'activity' ? activitiesByCluster.get(selection.id) : null

  const protocolsUsed = data?.protocols ?? []
  const stats = data?.stats

  return (
    <div className="cx">
      <div className="cx-top">
        <div className="cx-titles">
          <div className="cx-title">Behavior / context sequence</div>
          <div className="cx-sub">
            Captured event order with correlated activities · Elasticsearch source
          </div>
        </div>

        {stats && (
          <>
            <span className="cx-pill"><b>{stats.events.toLocaleString()}</b> events</span>
            <span className="cx-pill"><b>{stats.activities}</b> activities</span>
            <span className="cx-pill"><b>{stats.endpoints}</b> endpoints</span>
          </>
        )}

        <div className="cx-legend">
          {protocolsUsed.map((protocol) => (
            <span className="cx-legend-chip" key={protocol}>
              <span className="cx-dot" style={{ background: protocolColor(protocol) }} />
              {protocol}
            </span>
          ))}
        </div>

        <button className="cx-btn ghost" onClick={load} disabled={loading}>
          {loading ? 'Analyzing…' : 'Re-run'}
        </button>
        <button
          className="cx-btn"
          onClick={() => setPanelOpen((open) => !open)}
          disabled={!data}
        >
          {panelOpen ? 'Close panel' : 'Open panel'}
        </button>
      </div>

      {error ? (
        <div className="ec-placeholder">Context analysis failed: {error}</div>
      ) : loading && !data ? (
        <div className="ec-placeholder">Correlating captured events…</div>
      ) : !data?.events.length ? (
        <div className="ec-placeholder">
          No events in the datastore yet — capture some traffic, then re-run.
        </div>
      ) : (
        <div className="cx-stage">
          <div className="cx-canvas" ref={canvasRef}>
            {layout && (
              <Diagram
                layout={layout}
                highlighted={highlighted}
                selectedEventId={selectedEvent?.event_id}
                onPickEvent={showEvent}
                onPickActivity={showActivity}
              />
            )}
          </div>

          <div
            className={'cx-backdrop' + (panelOpen ? ' open' : '')}
            onClick={() => setPanelOpen(false)}
          />

          <aside className={'cx-panel' + (panelOpen ? ' open' : '')}>
            <div className="cx-panel-head">
              <div className="cx-tabs">
                <button
                  className={'cx-tab' + (tab === 'details' ? ' active' : '')}
                  onClick={() => setTab('details')}
                >
                  Details
                </button>
                <button
                  className={'cx-tab' + (tab === 'activities' ? ' active' : '')}
                  onClick={() => setTab('activities')}
                >
                  Activities
                </button>
              </div>
              <button
                className="cx-panel-close"
                onClick={() => setPanelOpen(false)}
                aria-label="Close panel"
              >
                ×
              </button>
            </div>

            <div className="cx-panel-body">
              {tab === 'activities' ? (
                <ActivityList
                  activities={data.activities}
                  selected={highlighted}
                  onPick={showActivity}
                />
              ) : selectedEvent ? (
                <EventDetails
                  event={selectedEvent}
                  onGotoActivity={showActivity}
                  onGotoPacket={onGotoPacket}
                />
              ) : selectedActivity ? (
                <ActivityDetails activity={selectedActivity} />
              ) : (
                <div className="cx-empty">
                  Click a packet arrow for its details, or an activity box for a summary.
                </div>
              )}
            </div>

            <div className="cx-notice">
              <b>Interpretation:</b> arrows show the chronological order of captured
              events, not causality. Activities are correlation clusters — events close
              in time that share an endpoint — not semantic labels like “Authentication”.
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// --- diagram ---------------------------------------------------------------

function Diagram({ layout, highlighted, selectedEventId, onPickEvent, onPickActivity }) {
  const { lifelines, rows, groups, width, height, chipWidth } = layout

  // One arrowhead per colour rather than per event: 400+ markers is needless
  // work for the renderer when only a handful of colours are in play.
  const markerColors = useMemo(
    () => [...new Set(rows.map((row) => protocolColor(row.event.protocol)))],
    [rows],
  )
  const markerId = (color) => `cx-arrow-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="cx-svg">
      <defs>
        {markerColors.map((color) => (
          <marker
            key={color}
            id={markerId(color)}
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={color} />
          </marker>
        ))}
      </defs>

      {groups.map(({ activity, y, height: boxHeight }) => {
        const color = activityColor(activity.cluster)
        const on = highlighted === activity.cluster
        return (
          <g
            key={activity.cluster}
            className={'cx-group' + (on ? ' on' : '')}
            onClick={() => onPickActivity(activity.cluster)}
          >
            <rect
              x="20"
              y={y}
              width={width - 40}
              height={boxHeight}
              rx="8"
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={on ? 3.5 : 2}
              strokeDasharray="8 6"
            />
            <text x="34" y={y + 18} fill={color.text} className="cx-group-label">
              {activity.label} · {activity.count} {activity.count === 1 ? 'event' : 'events'}
            </text>
          </g>
        )
      })}

      {lifelines.map(({ endpoint, x, chipTop, lifelineTop, label, truncated }) => (
        <g key={endpoint}>
          <line x1={x} y1={lifelineTop} x2={x} y2={height - 30} className="cx-lifeline" />
          <rect
            x={x - chipWidth / 2}
            y={chipTop}
            width={chipWidth}
            height={LAYOUT.chipHeight}
            rx="8"
            className="cx-chip"
          />
          <text
            x={x}
            y={chipTop + 21}
            textAnchor="middle"
            className="cx-chip-label"
          >
            {label}
          </text>
          {truncated && <title>{endpoint}</title>}
        </g>
      ))}

      {rows.map((row) => (
        <Arrow
          key={row.event.event_id}
          row={row}
          markerId={markerId(protocolColor(row.event.protocol))}
          selected={selectedEventId === row.event.event_id}
          onPick={onPickEvent}
        />
      ))}
    </svg>
  )
}

function Arrow({ row, markerId, selected, onPick }) {
  const { event, y, fromX, toX, selfMessage, labelMax } = row
  const color = protocolColor(event.protocol)
  // Protocol + time only: event_type is implied by the protocol and spending
  // characters on it is what pushed captions past the column width. The full
  // detail stays in the tooltip and the panel.
  const caption = `${event.protocol} \u00b7 ${fmtRel(event.rel_ts)}`
  const shown = fitText(caption, labelMax)

  // A transparent fat stroke under the visible one widens the click target.
  const geometry = selfMessage
    ? { d: `M ${fromX} ${y} C ${fromX + LAYOUT.selfLoopWidth} ${y}, ${fromX + LAYOUT.selfLoopWidth} ${y + LAYOUT.selfLoopDrop}, ${fromX} ${y + LAYOUT.selfLoopDrop}` }
    : { x1: fromX, y1: y, x2: toX, y2: y }
  const Shape = selfMessage ? 'path' : 'line'

  return (
    <g className={'cx-arrow' + (selected ? ' on' : '')} onClick={() => onPick(event.event_id)}>
      <Shape {...geometry} stroke="transparent" strokeWidth="16" fill="none" />
      <Shape
        {...geometry}
        stroke={color}
        strokeWidth={selected ? 4 : 2.25}
        strokeLinecap="round"
        fill="none"
        markerEnd={`url(#${markerId})`}
        pointerEvents="none"
      />
      {shown && (
        <text
          x={selfMessage ? fromX : (fromX + toX) / 2}
          y={y - 8}
          textAnchor="middle"
          className="cx-arrow-label"
          pointerEvents="none"
        >
          {shown}
        </text>
      )}
      <title>
        {`${event.protocol} \u00b7 ${event.event_type} \u00b7 ${fmtRel(event.rel_ts)}`}
        {` \u2014 ${event.source} \u2192 ${event.destination}`}
      </title>
    </g>
  )
}

// --- panel contents --------------------------------------------------------

function EventDetails({ event, onGotoActivity, onGotoPacket }) {
  return (
    <>
      <Row label="Protocol">
        <span className="cx-proto" style={{ background: protocolColor(event.protocol) }}>
          {event.protocol}
        </span>
        <span className="cx-faint" style={{ marginLeft: 8 }}>{event.event_type}</span>
      </Row>
      <Row label="Time (relative)" mono>{fmtRel(event.rel_ts)}</Row>
      <Row label="Captured at" mono>{fmtClock(event.ts)}</Row>
      <Row label="Source → Destination" mono>
        {event.source} → {event.destination}
      </Row>
      <Row label="Activity">
        <span className="link" onClick={() => onGotoActivity(event.cluster)}>
          {event.activity}
        </span>
      </Row>
      <Row label="Length" mono>{event.length_bytes} bytes</Row>
      <Row label="Record" mono>{event.record_id}</Row>
      {onGotoPacket && (
        <Row label="Timeline">
          <span className="link" onClick={() => onGotoPacket(event.record_id)}>
            Show this packet in the Live Timeline
          </span>
        </Row>
      )}
      <Row label="Payload">
        <div className="cx-payload">{event.payload || '(empty)'}</div>
      </Row>
    </>
  )
}

function ActivityDetails({ activity }) {
  return (
    <>
      <Row label="Activity">
        <b style={{ fontSize: 15 }}>{activity.label}</b>
      </Row>

      <div className="cx-stat-grid">
        <div className="cx-stat">
          <div className="n">{activity.count}</div>
          <div className="l">Events</div>
        </div>
        <div className="cx-stat">
          <div className="n">{fmtDuration(activity.duration)}</div>
          <div className="l">Span</div>
        </div>
      </div>

      <Row label="Time range (relative)" mono>
        {fmtRel(activity.start)} → {fmtRel(activity.end)}
      </Row>

      <Row label="Protocol breakdown">
        {activity.protocols.map(({ protocol, count }) => {
          const color = protocolColor(protocol)
          const pct = activity.count ? Math.round((count / activity.count) * 100) : 0
          return (
            <div className="cx-bar-row" key={protocol}>
              <span className="cx-proto" style={{ background: color }}>{protocol}</span>
              <span className="cx-bar-track">
                <span className="cx-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </span>
              <span className="cx-faint">{count}</span>
            </div>
          )
        })}
      </Row>

      <Row label="Participating endpoints">
        {activity.participants.length ? (
          activity.participants.map(({ entity, count }) => (
            <div className="cx-participant mono" key={entity}>
              {entity} <span className="cx-faint">({count})</span>
            </div>
          ))
        ) : (
          <span className="cx-faint">None recorded</span>
        )}
      </Row>
    </>
  )
}

function ActivityList({ activities, selected, onPick }) {
  if (!activities.length) return <div className="cx-empty">No activities were found.</div>
  return (
    <>
      {activities.map((activity) => (
        <div
          key={activity.cluster}
          className={'cx-card' + (selected === activity.cluster ? ' on' : '')}
          onClick={() => onPick(activity.cluster)}
        >
          <div className="name">{activity.label}</div>
          <div className="meta">
            {activity.count} {activity.count === 1 ? 'event' : 'events'} ·{' '}
            {fmtDuration(activity.duration)} ·{' '}
            {activity.protocols.map((p) => p.protocol).join(', ')}
          </div>
        </div>
      ))}
    </>
  )
}

function Row({ label, mono, children }) {
  return (
    <div className="cx-row">
      <div className="cx-row-key">{label}</div>
      <div className={'cx-row-val' + (mono ? ' mono' : '')}>{children}</div>
    </div>
  )
}
