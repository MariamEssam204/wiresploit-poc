/**
 * Module: PayloadView
 * Purpose: Payload of the selected packet: hex dump on top, decoded ASCII
 *          below, with the active search term highlighted in both.
 * Owner: Full Stack team
 */
import { buildAsciiPreview, findMatchIndexes, formatHex, parseHexBytes } from '../../lib/format.js'

const HEX_BYTES_PER_ROW = 16
const OFFSET_HEX_DIGITS = 4

/**
 * @param {object} props
 * @param {object | null} props.packet The selected packet, or null.
 * @param {string} props.highlightTerm Search term to highlight; may be empty.
 */
export default function PayloadView({ packet, highlightTerm }) {
  if (!packet) return <div className="empty-hint">No packet selected.</div>

  if (packet.malformed || !packet.payload_hex) {
    const missingReason = packet.payload_hex == null ? 'missing' : 'empty'
    return (
      <div className="empty-hint">
        No payload: <code>payload_hex</code> is {missingReason}.
      </div>
    )
  }

  const bytes = parseHexBytes(packet.payload_hex)
  const asciiText = buildAsciiPreview(bytes)
  const highlightIndexes = findMatchIndexes(asciiText, highlightTerm)

  const hexRows = []
  for (let rowStart = 0; rowStart < bytes.length; rowStart += HEX_BYTES_PER_ROW) {
    const rowBytes = bytes.slice(rowStart, rowStart + HEX_BYTES_PER_ROW)
    hexRows.push(
      <div className="hex-line" key={rowStart}>
        <span className="hex-offset">{formatHex(rowStart, OFFSET_HEX_DIGITS)}</span>
        <span className="hex-bytes">
          {rowBytes.map((byteValue, byteIndex) => (
            <span
              key={byteIndex}
              className={'hex-byte' + (highlightIndexes.has(rowStart + byteIndex) ? ' is-highlighted' : '')}
            >
              {formatHex(byteValue)}
            </span>
          ))}
        </span>
      </div>,
    )
  }

  return (
    <div className="payload-view">
      <div className="payload-label">Hex · {bytes.length} bytes</div>
      <div className="hex-grid">{hexRows}</div>
      <div className="payload-label">ASCII</div>
      <div className="payload-ascii">
        {asciiText.split('').map((character, index) => (
          <span key={index} className={highlightIndexes.has(index) ? 'is-highlighted' : undefined}>
            {character}
          </span>
        ))}
      </div>
    </div>
  )
}
