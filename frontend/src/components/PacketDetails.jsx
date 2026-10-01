import { fmtClock } from '../lib/format.js'

// Field view for the selected packet (wiresploit-poc1 schema). PSF is a JSON
// column shown as a collapsible dropdown — click it to expand the full JSON.
export default function PacketDetails({ packet }) {
  if (!packet) return <div className="empty-hint">Select a packet to inspect its fields.</div>

  const rows = [
    ['No.', packet.id],
    ['Timestamp', `${fmtClock(packet.timestamp)}`],
    ['Event type', packet.event_type],
    ['Protocol', packet.protocol],
    ['Duration', packet.duration],
    ['Length', packet.length_bytes != null ? `${packet.length_bytes} bytes` : undefined],
    ['Payload (hex)', packet.payload_hex],
    ['Payload (ASCII)', packet.payload_ascii],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '')

  const psf = packet.psf && typeof packet.psf === 'object' ? packet.psf : null

  return (
    <details className="tree-sec" open>
      <summary>Packet</summary>
      <div className="tree-items">
        {packet.malformed && (
          <div className="tree-item" style={{ color: 'var(--err)' }}><b>⚠ malformed:</b> payload_hex missing/invalid</div>
        )}
        {rows.map(([k, v]) => (
          <div className="tree-item" key={k}><b>{k}:</b> {String(v)}</div>
        ))}

        {/* PSF — a JSON column, shown as a click-to-expand dropdown */}
        <details className="psf-drop">
          <summary><b>PSF</b> <span className="psf-hint">(protocol-specific fields — click to expand JSON)</span></summary>
          <pre className="psf-json">{psf ? JSON.stringify(psf, null, 2) : '{}'}</pre>
        </details>
      </div>
    </details>
  )
}
