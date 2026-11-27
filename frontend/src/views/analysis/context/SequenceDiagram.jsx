/**
 * Module: SequenceDiagram
 * Purpose: Draw the behavior / context sequence diagram as SVG. Endpoints
 *          are lifelines, each event is an arrow in capture order, and each
 *          correlated activity is a dashed box around its events.
 * Owner: Full Stack team
 *
 * Arrows use the lane colour of their protocol (Brand Manual, "Lanes");
 * the protocol name is always in the caption so colour is never the only
 * cue. Activities are correlation clusters, not buses, so they stay neutral.
 */
import { useMemo } from 'react'
import { getMarkColorForName } from '../../../theme/lanes.js'
import { formatRelativeSeconds } from './contextFormat.js'
import { LAYOUT, fitTextToWidth } from './sequenceLayout.js'

const GROUP_INSET_PX = 20
const GROUP_LABEL_OFFSET_X_PX = 34
const GROUP_LABEL_OFFSET_Y_PX = 18
const CHIP_LABEL_BASELINE_PX = 21
const LIFELINE_BOTTOM_MARGIN_PX = 30
const ARROW_LABEL_LIFT_PX = 8
const ARROW_HIT_WIDTH_PX = 16
const ARROW_WIDTH_PX = 2
const ARROW_SELECTED_WIDTH_PX = 3.5

function buildMarkerId(color) {
  return `seq-arrow-${color.replace(/[^a-z0-9]/gi, '')}`
}

/**
 * @param {object} props
 * @param {object} props.layout Output of buildSequenceLayout().
 * @param {number | null} props.highlightedCluster Activity to emphasise.
 * @param {string | undefined} props.selectedEventId Event to emphasise.
 * @param {(eventId: string) => void} props.onSelectEvent
 * @param {(cluster: number) => void} props.onSelectActivity
 */
export default function SequenceDiagram({
  layout,
  highlightedCluster,
  selectedEventId,
  onSelectEvent,
  onSelectActivity,
}) {
  const { lifelines, rows, groups, widthPx, heightPx, chipWidthPx } = layout

  // One arrowhead per colour rather than per event: hundreds of markers is
  // needless work for the renderer when only a handful of colours are used.
  const markerColors = useMemo(
    () => [...new Set(rows.map((row) => getMarkColorForName(row.event.protocol)))],
    [rows],
  )

  return (
    <svg width={widthPx} height={heightPx} viewBox={`0 0 ${widthPx} ${heightPx}`} className="seq-svg">
      <defs>
        {markerColors.map((color) => (
          <marker
            key={color}
            id={buildMarkerId(color)}
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

      {groups.map(({ activity, y, height }) => {
        const isHighlighted = highlightedCluster === activity.cluster
        const eventWord = activity.count === 1 ? 'event' : 'events'
        return (
          <g
            key={activity.cluster}
            className={'seq-group' + (isHighlighted ? ' is-highlighted' : '')}
            onClick={() => onSelectActivity(activity.cluster)}
          >
            <rect x={GROUP_INSET_PX} y={y} width={widthPx - GROUP_INSET_PX * 2} height={height} rx="10" />
            <text x={GROUP_LABEL_OFFSET_X_PX} y={y + GROUP_LABEL_OFFSET_Y_PX} className="seq-group-label">
              {activity.label} · {activity.count} {eventWord}
            </text>
          </g>
        )
      })}

      {lifelines.map(({ endpoint, x, chipTop, lifelineTop, label, isTruncated }) => (
        <g key={endpoint}>
          <line x1={x} y1={lifelineTop} x2={x} y2={heightPx - LIFELINE_BOTTOM_MARGIN_PX} className="seq-lifeline" />
          <rect
            x={x - chipWidthPx / 2}
            y={chipTop}
            width={chipWidthPx}
            height={LAYOUT.chipHeightPx}
            rx="8"
            className="seq-chip"
          />
          <text x={x} y={chipTop + CHIP_LABEL_BASELINE_PX} textAnchor="middle" className="seq-chip-label">
            {label}
          </text>
          {isTruncated && <title>{endpoint}</title>}
        </g>
      ))}

      {rows.map((row) => (
        <EventArrow
          key={row.event.event_id}
          row={row}
          markerId={buildMarkerId(getMarkColorForName(row.event.protocol))}
          isSelected={selectedEventId === row.event.event_id}
          onSelect={onSelectEvent}
        />
      ))}
    </svg>
  )
}

function EventArrow({ row, markerId, isSelected, onSelect }) {
  const { event, y, fromX, toX, isSelfMessage, labelMaxWidthPx } = row
  const color = getMarkColorForName(event.protocol)
  // Protocol + time only: event_type is implied by the protocol, and spending
  // characters on it pushed captions past the column width. The full detail
  // stays in the tooltip and the side panel.
  const caption = `${event.protocol} · ${formatRelativeSeconds(event.rel_ts)}`
  const shownCaption = fitTextToWidth(caption, labelMaxWidthPx)

  const geometry = isSelfMessage
    ? {
        d:
          `M ${fromX} ${y} C ${fromX + LAYOUT.selfLoopWidthPx} ${y}, ` +
          `${fromX + LAYOUT.selfLoopWidthPx} ${y + LAYOUT.selfLoopDropPx}, ${fromX} ${y + LAYOUT.selfLoopDropPx}`,
      }
    : { x1: fromX, y1: y, x2: toX, y2: y }
  const Shape = isSelfMessage ? 'path' : 'line'

  return (
    <g className={'seq-arrow' + (isSelected ? ' is-selected' : '')} onClick={() => onSelect(event.event_id)}>
      {/* A transparent wide stroke under the visible one widens the click target. */}
      <Shape {...geometry} stroke="transparent" strokeWidth={ARROW_HIT_WIDTH_PX} fill="none" />
      <Shape
        {...geometry}
        className="seq-arrow-line"
        stroke={color}
        strokeWidth={isSelected ? ARROW_SELECTED_WIDTH_PX : ARROW_WIDTH_PX}
        strokeLinecap="round"
        fill="none"
        markerEnd={`url(#${markerId})`}
        pointerEvents="none"
      />
      {shownCaption && (
        <text
          x={isSelfMessage ? fromX : (fromX + toX) / 2}
          y={y - ARROW_LABEL_LIFT_PX}
          textAnchor="middle"
          className="seq-arrow-label"
          pointerEvents="none"
        >
          {shownCaption}
        </text>
      )}
      <title>
        {`${event.protocol} · ${event.event_type} · ${formatRelativeSeconds(event.rel_ts)}`}
        {` — ${event.source} → ${event.destination}`}
      </title>
    </g>
  )
}
