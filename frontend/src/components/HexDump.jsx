import { toHex, hexToBytes } from '../lib/format.js'

// Payload view for the selected packet: the raw hex dump on top, and the decoded
// ASCII below (the payload_hex is decoded to ASCII in the backend). When a search
// term is active, the matching ASCII is highlighted.
export default function PayloadView({ packet, highlight }) {
  if (!packet) return <div className="empty-hint">No packet selected.</div>
  if (packet.malformed || !packet.payload_hex) {
    return (
      <div className="empty-hint">
        No payload — <code>payload_hex</code> is {packet.payload_hex == null ? 'missing/null' : 'empty'}.
        {packet.malformed && <div style={{ color: 'var(--err)', marginTop: 6 }}>Packet flagged malformed.</div>}
      </div>
    )
  }

  const bytes = hexToBytes(packet.payload_hex)
  const ascii = bytes.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('')

  // Which ASCII indices to highlight for the search term.
  const hlSet = new Set()
  const term = (highlight || '').toLowerCase()
  if (term) {
    const low = ascii.toLowerCase()
    let from = 0
    while (true) {
      const at = low.indexOf(term, from)
      if (at < 0) break
      for (let i = at; i < at + term.length; i++) hlSet.add(i)
      from = at + term.length
    }
  }

  const hexRows = []
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16)
    hexRows.push(
      <div className="hex-line" key={i}>
        <span className="hex-off">{toHex(i, 4)}</span>
        <span className="hex-bytes">
          {chunk.map((b, j) => (
            <span className={'hex-byte' + (hlSet.has(i + j) ? ' hl' : '')} key={j}>{toHex(b)}</span>
          ))}
        </span>
      </div>,
    )
  }

  return (
    <div className="payload-view">
      <div className="pv-label">Hex</div>
      <div className="hex-grid">{hexRows}</div>
      <div className="pv-label">ASCII</div>
      <div className="pv-ascii">
        {ascii.split('').map((ch, i) => (
          <span key={i} className={hlSet.has(i) ? 'hl' : ''}>{ch}</span>
        ))}
      </div>
    </div>
  )
}
