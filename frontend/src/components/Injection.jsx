import { useState } from 'react'
// Injection tab: imports the STANDALONE injection UI directly from the
// ../final-injection-code folder (kept separate for easy further modification).
// Its services call /api/injection, which Vite proxies to that app's backend.
// Styling uses THIS app's theme (index.css) — final-injection-code's own CSS is
// not loaded — so the tool looks unified with the rest of the app.
import NetworkInjection from '../../injection-ui/pages/NetworkInjection'
import UartInjection from '../../injection-ui/pages/UartInjection'

export default function Injection({ capturing }) {
  const [domain, setDomain] = useState('network')
  return (
    <div className="view injection-root">
      <div className="inj-subnav">
        <button className={'inj-domain' + (domain === 'network' ? ' active' : '')} onClick={() => setDomain('network')}>
          Network
        </button>
        <button className={'inj-domain' + (domain === 'uart' ? ' active' : '')} onClick={() => setDomain('uart')}>
          UART
        </button>
        <span className="inj-hint">Standalone injection app · PC-local + optional Pi node</span>
      </div>
      {domain === 'network'
        ? <NetworkInjection capturing={capturing} />
        : <UartInjection capturing={capturing} />}
    </div>
  )
}
