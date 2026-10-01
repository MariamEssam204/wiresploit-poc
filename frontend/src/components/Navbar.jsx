import { fmtDuration } from '../lib/format.js'

// Top navbar: brand, capture controls, live status.
export default function Navbar({ capturing, elapsed, packetCount, onStart, onStop, onClear }) {
  return (
    <div className="navbar">
      <div className="brand">
        <svg className="logo" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="#0d1b22" />
          <path d="M4 16 H10 L13 8 L17 24 L20 16 H28" stroke="#22d3ee" strokeWidth="2.2"
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <b>wiresploit</b>
          <div className="tag">bus analyzer</div>
        </div>
      </div>

      <div className="spacer" />

      <span className="clock">{packetCount.toLocaleString()} packets</span>

      <div className="status-chip">
        <span className={'rec-dot' + (capturing ? ' live' : '')} />
        <span>{capturing ? 'Capturing' : 'Idle'}</span>
        <span className="clock">{fmtDuration(elapsed)}</span>
      </div>

      {capturing ? (
        <button className="nav-btn stop" onClick={onStop}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="1" />
          </svg>
          STOP CAPTURE
        </button>
      ) : (
        <button className="nav-btn start" onClick={onStart}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4l14 8-14 8V4z" />
          </svg>
          START CAPTURE
        </button>
      )}

      <button className="nav-btn ghost" onClick={onClear} disabled={packetCount === 0}>
        Clear
      </button>
    </div>
  )
}
