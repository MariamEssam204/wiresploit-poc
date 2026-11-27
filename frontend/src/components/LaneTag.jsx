/**
 * Module: LaneTag
 * Purpose: Show a protocol or event type as a coloured lane block plus a
 *          grey label, so meaning never depends on colour alone.
 * Owner: Full Stack team
 */
import { getMarkColorForName } from '../theme/lanes.js'

/**
 * @param {object} props
 * @param {string} props.name Protocol or event_type value to show.
 */
export default function LaneTag({ name }) {
  if (!name) return null
  return (
    <span className="lane-tag">
      <LaneSwatch name={name} />
      {name}
    </span>
  )
}

/**
 * The coloured block on its own, for chips and legends.
 * @param {object} props
 * @param {string} props.name Protocol or event_type value.
 */
export function LaneSwatch({ name }) {
  return <span className="lane-swatch" style={{ background: getMarkColorForName(name) }} />
}
