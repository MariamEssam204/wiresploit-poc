/**
 * Module: PacketDetails
 * Purpose: Field list for the selected packet (wiresploit-poc1 schema),
 *          with the protocol-specific fields (PSF) as an expandable JSON block.
 * Owner: Full Stack team
 */
import LaneTag from '../../components/LaneTag.jsx'
import { formatClockTime } from '../../lib/format.js'

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function buildFieldRows(packet) {
  return [
    ['No.', packet.id],
    ['Timestamp', formatClockTime(packet.timestamp)],
    ['Event type', packet.event_type],
    ['Protocol', packet.protocol],
    ['Duration', packet.duration],
    ['Length', hasValue(packet.length_bytes) ? `${packet.length_bytes} bytes` : undefined],
    ['Payload (hex)', packet.payload_hex],
    ['Payload (ASCII)', packet.payload_ascii],
  ].filter(([, value]) => hasValue(value))
}

/**
 * @param {object} props
 * @param {object | null} props.packet The selected packet, or null.
 */
export default function PacketDetails({ packet }) {
  if (!packet) return <div className="empty-hint">Select a packet to inspect its fields.</div>

  const psf = packet.psf && typeof packet.psf === 'object' ? packet.psf : null

  return (
    <div className="packet-details">
      <div className="packet-details-head">
        <LaneTag name={packet.event_type} />
        <span className="faint mono">#{packet.id}</span>
      </div>

      {packet.malformed && (
        <div className="banner-warn">Malformed: payload_hex is missing or invalid.</div>
      )}

      <dl className="kv-grid">
        {buildFieldRows(packet).map(([label, value]) => (
          <div className="kv-row" key={label}>
            <dt>{label}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>

      <details className="psf-block">
        <summary>
          PSF <span className="faint">protocol-specific fields</span>
        </summary>
        <pre>{psf ? JSON.stringify(psf, null, 2) : '{}'}</pre>
      </details>
    </div>
  )
}
