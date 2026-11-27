/**
 * Module: PacketTable
 * Purpose: The scrolling packet table of the Live timeline.
 * Owner: Full Stack team
 */
import { useEffect, useRef } from 'react'
import LaneTag from '../../components/LaneTag.jsx'
import { buildPsfPreview, formatClockTime } from '../../lib/format.js'

const COLUMNS = ['No.', 'Timestamp', 'Event', 'Protocol', 'Duration', 'Length', 'PSF']

/**
 * @param {object} props
 * @param {object[]} props.rows Packets to show, in display order.
 * @param {string | null} props.selectedPacketId
 * @param {(packetId: string) => void} props.onSelectPacket
 * @param {boolean} props.shouldAutoScroll Keep the newest row in view.
 * @param {string} props.emptyMessage Shown when there are no rows.
 */
export default function PacketTable({ rows, selectedPacketId, onSelectPacket, shouldAutoScroll, emptyMessage }) {
  const scrollContainer = useRef(null)

  useEffect(() => {
    if (shouldAutoScroll && scrollContainer.current) {
      scrollContainer.current.scrollTop = scrollContainer.current.scrollHeight
    }
  }, [rows.length, shouldAutoScroll])

  return (
    <div className="packet-table-wrap" ref={scrollContainer}>
      <table className="data-table is-mono packet-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((packet) => {
            const isSelected = String(packet.id) === String(selectedPacketId)
            const rowClass =
              'is-clickable' + (isSelected ? ' is-selected' : '') + (packet.isLive ? ' is-new' : '')
            return (
              <tr key={packet.id} className={rowClass} onClick={() => onSelectPacket(packet.id)}>
                <td className="faint">{packet.id}</td>
                <td>{formatClockTime(packet.timestamp)}</td>
                <td>
                  {packet.malformed && (
                    <span className="malformed-flag" title="payload_hex missing or invalid">
                      !
                    </span>
                  )}
                  <LaneTag name={packet.event_type} />
                </td>
                <td>{packet.protocol}</td>
                <td>{packet.duration ?? ''}</td>
                <td>{packet.length_bytes ?? ''}</td>
                <td className="psf-cell" title={JSON.stringify(packet.psf)}>
                  {buildPsfPreview(packet.psf)}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length}>
                <div className="empty-hint">{emptyMessage}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
