/**
 * Module: InjectionView
 * Purpose: Injection tab: capture controls, the live packet table, and the
 *          details of the selected packet, on one page.
 * Owner: Full Stack team
 *
 * The buttons drive the same capture as the navbar (useCapture), and the
 * table shows the same live feed as the Live timeline. The Injection
 * backend will be connected later by its owner.
 *
 * The earlier per-domain pages (Network / UART forms in injection-ui) are
 * kept in the codebase but not shown. To bring them back, render the
 * domains listed in ./injectionDomains.js.
 */
import { useAppContext } from '../../app/AppContext.jsx'
import { formatSessionClock } from '../../lib/format.js'
import PacketTable from '../timeline/PacketTable.jsx'
import PacketDetails from '../timeline/PacketDetails.jsx'
import '../timeline/timeline.css'
import './injection.css'

const MAX_VISIBLE_ROWS = 1500

function isSamePacketId(left, right) {
  return String(left) === String(right)
}

export default function InjectionView() {
  const { capture } = useAppContext()
  const { packets, isCapturing, elapsedMs, selectedPacketId, selectPacket, startCapture, stopCapture } =
    capture

  const tableRows = packets.slice(-MAX_VISIBLE_ROWS)
  const selectedPacket = packets.find((packet) => isSamePacketId(packet.id, selectedPacketId)) || null

  return (
    <div className="view">
      <div className="view-header">
        <div className="titles">
          <h2>Injection</h2>
          <div className="subtitle">Live packets from the current capture session</div>
        </div>

        <span className="stat-pill">
          <b>{packets.length.toLocaleString()}</b> packets
        </span>
        <span className="stat-pill">
          <b>{formatSessionClock(elapsedMs)}</b>
        </span>

        <button className="btn btn-primary" onClick={startCapture} disabled={isCapturing}>
          Start capture
        </button>
        <button className="btn" onClick={stopCapture} disabled={!isCapturing}>
          Stop capture
        </button>
      </div>

      <div className="timeline-split">
        <PacketTable
          rows={tableRows}
          selectedPacketId={selectedPacketId}
          onSelectPacket={selectPacket}
          shouldAutoScroll
          emptyMessage="Press Start capture. Packets appear here as they arrive."
        />

        <div className="timeline-detail-row">
          <section className="timeline-pane">
            <div className="pane-title">Packet details</div>
            <PacketDetails packet={selectedPacket} />
          </section>
        </div>
      </div>
    </div>
  )
}
