/**
 * Module: Navbar
 * Purpose: Top bar: logo, packet count, capture status and clock, and the
 *          capture controls.
 * Owner: Full Stack team
 */
import { useAppContext } from '../app/AppContext.jsx'
import { formatSessionClock } from '../lib/format.js'
import BrandMark from './BrandMark.jsx'
import './Navbar.css'

export default function Navbar() {
  const { capture } = useAppContext()
  const { isCapturing, elapsedMs, packets, captureError, startCapture, stopCapture, clearPackets } =
    capture
  const packetCount = packets.length

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <BrandMark />
        <span className="navbar-product">bus analyzer</span>
      </div>

      <div className="navbar-spacer" />

      {captureError && (
        <span className="navbar-error" title={captureError}>
          Backend unreachable
        </span>
      )}

      <span className="navbar-metric">
        <b>{packetCount.toLocaleString()}</b> packets
      </span>

      <div className={'capture-status' + (isCapturing ? ' is-live' : '')}>
        <span className="capture-dot" />
        <span>{isCapturing ? 'Capturing' : 'Idle'}</span>
        <span className="capture-clock">{formatSessionClock(elapsedMs)}</span>
      </div>

      {isCapturing ? (
        <button className="btn" onClick={stopCapture}>
          <StopIcon />
          Stop capture
        </button>
      ) : (
        <button className="btn btn-primary" onClick={startCapture}>
          <StartIcon />
          Start capture
        </button>
      )}

      <button className="btn btn-ghost" onClick={clearPackets} disabled={packetCount === 0}>
        Clear
      </button>
    </header>
  )
}

function StartIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
    </svg>
  )
}
