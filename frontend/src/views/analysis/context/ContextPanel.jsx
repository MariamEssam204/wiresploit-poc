/**
 * Module: ContextPanel
 * Purpose: Slide-over panel for Context Analysis: details of the selected
 *          event or activity, and the list of all activities.
 * Owner: Full Stack team
 */
import LaneTag from '../../../components/LaneTag.jsx'
import TabBar from '../../../components/TabBar.jsx'
import { getMarkColorForName } from '../../../theme/lanes.js'
import { formatEpochSeconds, formatRelativeSeconds, formatSpan } from './contextFormat.js'

export const PANEL_TABS = {
  DETAILS: 'details',
  ACTIVITIES: 'activities',
}

const PANEL_TAB_LIST = [
  { id: PANEL_TABS.DETAILS, label: 'Details' },
  { id: PANEL_TABS.ACTIVITIES, label: 'Activities' },
]

const PERCENT = 100

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.activeTab One of PANEL_TABS.
 * @param {(tabId: string) => void} props.onTabChange
 * @param {object[]} props.activities All activities from the analysis.
 * @param {object | null} props.selectedEvent
 * @param {object | null} props.selectedActivity
 * @param {number | null} props.highlightedCluster
 * @param {(cluster: number) => void} props.onSelectActivity
 * @param {(packetId: string) => void} props.onShowPacket
 */
export default function ContextPanel({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  activities,
  selectedEvent,
  selectedActivity,
  highlightedCluster,
  onSelectActivity,
  onShowPacket,
}) {
  return (
    <>
      <div className={'ctx-backdrop' + (isOpen ? ' is-open' : '')} onClick={onClose} />

      <aside className={'ctx-panel' + (isOpen ? ' is-open' : '')} aria-hidden={!isOpen}>
        <div className="ctx-panel-head">
          <TabBar variant="secondary" tabs={PANEL_TAB_LIST} activeId={activeTab} onSelect={onTabChange} />
          <button className="btn btn-icon" onClick={onClose} aria-label="Close panel">
            ×
          </button>
        </div>

        <div className="ctx-panel-body">
          {activeTab === PANEL_TABS.ACTIVITIES ? (
            <ActivityList
              activities={activities}
              highlightedCluster={highlightedCluster}
              onSelect={onSelectActivity}
            />
          ) : selectedEvent ? (
            <EventDetails event={selectedEvent} onSelectActivity={onSelectActivity} onShowPacket={onShowPacket} />
          ) : selectedActivity ? (
            <ActivityDetails activity={selectedActivity} />
          ) : (
            <div className="faint">Click an arrow for its details, or an activity box for a summary.</div>
          )}
        </div>

        <div className="ctx-notice">
          <b>How to read this:</b> arrows show the order events were captured, not causality.
          Activities are correlation clusters (events close in time that share an endpoint),
          not semantic labels like “Authentication”.
        </div>
      </aside>
    </>
  )
}

function EventDetails({ event, onSelectActivity, onShowPacket }) {
  return (
    <>
      <DetailRow label="Protocol">
        <LaneTag name={event.protocol} />
        <span className="faint" style={{ marginLeft: 8 }}>
          {event.event_type}
        </span>
      </DetailRow>
      <DetailRow label="Time (relative)" isMono>
        {formatRelativeSeconds(event.rel_ts)}
      </DetailRow>
      <DetailRow label="Captured at" isMono>
        {formatEpochSeconds(event.ts)}
      </DetailRow>
      <DetailRow label="Source → Destination" isMono>
        {event.source} → {event.destination}
      </DetailRow>
      <DetailRow label="Activity">
        <button className="link" onClick={() => onSelectActivity(event.cluster)}>
          {event.activity}
        </button>
      </DetailRow>
      <DetailRow label="Length" isMono>
        {event.length_bytes} bytes
      </DetailRow>
      <DetailRow label="Record" isMono>
        {event.record_id}
      </DetailRow>
      <DetailRow label="Timeline">
        <button className="link" onClick={() => onShowPacket(event.record_id)}>
          Show this packet in the Live timeline
        </button>
      </DetailRow>
      <DetailRow label="Payload">
        <div className="code-block">{event.payload || '(empty)'}</div>
      </DetailRow>
    </>
  )
}

function ActivityDetails({ activity }) {
  return (
    <>
      <DetailRow label="Activity">
        <span className="ctx-activity-name">{activity.label}</span>
      </DetailRow>

      <div className="ctx-stat-grid">
        <div className="stat-tile">
          <div className="label">Events</div>
          <div className="value">{activity.count}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Span</div>
          <div className="value">{formatSpan(activity.duration)}</div>
        </div>
      </div>

      <DetailRow label="Time range (relative)" isMono>
        {formatRelativeSeconds(activity.start)} → {formatRelativeSeconds(activity.end)}
      </DetailRow>

      <DetailRow label="Protocol breakdown">
        {activity.protocols.map(({ protocol, count }) => {
          const sharePercent = activity.count ? Math.round((count / activity.count) * PERCENT) : 0
          return (
            <div className="ctx-bar-row" key={protocol}>
              <span className="ctx-bar-label">
                <LaneTag name={protocol} />
              </span>
              <span className="ctx-bar-track">
                <span
                  className="ctx-bar-fill"
                  style={{ width: `${sharePercent}%`, background: getMarkColorForName(protocol) }}
                />
              </span>
              <span className="faint mono">{count}</span>
            </div>
          )
        })}
      </DetailRow>

      <DetailRow label="Participating endpoints">
        {activity.participants.length ? (
          activity.participants.map(({ entity, count }) => (
            <div className="ctx-participant mono" key={entity}>
              {entity} <span className="faint">({count})</span>
            </div>
          ))
        ) : (
          <span className="faint">None recorded</span>
        )}
      </DetailRow>
    </>
  )
}

function ActivityList({ activities, highlightedCluster, onSelect }) {
  if (!activities.length) return <div className="faint">No activities were found.</div>
  return activities.map((activity) => {
    const eventWord = activity.count === 1 ? 'event' : 'events'
    const isHighlighted = highlightedCluster === activity.cluster
    return (
      <button
        key={activity.cluster}
        className={'ctx-card' + (isHighlighted ? ' is-highlighted' : '')}
        onClick={() => onSelect(activity.cluster)}
      >
        <span className="ctx-card-name">{activity.label}</span>
        <span className="ctx-card-meta">
          {activity.count} {eventWord} · {formatSpan(activity.duration)} ·{' '}
          {activity.protocols.map((entry) => entry.protocol).join(', ')}
        </span>
      </button>
    )
  })
}

function DetailRow({ label, isMono, children }) {
  return (
    <div className="ctx-row">
      <div className="ctx-row-label">{label}</div>
      <div className={'ctx-row-value' + (isMono ? ' mono' : '')}>{children}</div>
    </div>
  )
}
