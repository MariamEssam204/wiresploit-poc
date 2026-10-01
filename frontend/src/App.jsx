import { useState } from 'react'
import Navbar from './components/Navbar.jsx'
import LiveTimeline from './components/LiveTimeline.jsx'
import AnalysisEngines from './components/AnalysisEngines.jsx'
import Injection from './components/Injection.jsx'
import { useCapture } from './hooks/useCapture.js'

const TABS = [
  { id: 'timeline', label: 'Live Timeline' },
  { id: 'engines', label: 'Analysis Engines' },
  { id: 'injection', label: 'Injection' },
]

export default function App() {
  const { packets, capturing, connected, selectedId, setSelectedId, elapsed, start, stop, clear } = useCapture()
  const [tab, setTab] = useState('timeline')

  // A finding's evidence link jumps to the Live Timeline and selects the packet.
  const gotoPacket = (id) => {
    setSelectedId(id)
    setTab('timeline')
  }

  return (
    <div className="app">
      <Navbar
        capturing={capturing}
        elapsed={elapsed}
        packetCount={packets.length}
        onStart={start}
        onStop={stop}
        onClear={clear}
      />

      <div className="tabbar">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={'tab' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'timeline' && (
        <LiveTimeline packets={packets} selectedId={selectedId} onSelect={setSelectedId} connected={connected} capturing={capturing} />
      )}
      {tab === 'engines' && <AnalysisEngines packets={packets} onGotoPacket={gotoPacket} />}
      {tab === 'injection' && <Injection capturing={capturing} />}
    </div>
  )
}
