/**
 * Module: App
 * Purpose: App shell: navbar, the main tab strip and the active view.
 *          Views come from app/viewRegistry.js; shared state is provided
 *          through AppContext.
 * Owner: Full Stack team
 */
import { useCallback, useMemo, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import TabBar from './components/TabBar.jsx'
import { AppContextProvider } from './app/AppContext.jsx'
import { DEFAULT_VIEW_ID, VIEWS, VIEW_IDS, findViewById } from './app/viewRegistry.js'
import { useCapture } from './hooks/useCapture.js'

export default function App() {
  const capture = useCapture()
  const [activeViewId, setActiveViewId] = useState(DEFAULT_VIEW_ID)
  const { selectPacket } = capture

  // An evidence link anywhere in the app jumps to the Live timeline and
  // selects that packet.
  const showPacket = useCallback(
    (packetId) => {
      selectPacket(packetId)
      setActiveViewId(VIEW_IDS.TIMELINE)
    },
    [selectPacket],
  )

  const appState = useMemo(
    () => ({
      capture,
      navigation: { activeViewId, showView: setActiveViewId, showPacket },
    }),
    [capture, activeViewId, showPacket],
  )

  const ActiveView = findViewById(activeViewId)?.component

  return (
    <AppContextProvider value={appState}>
      <div className="app">
        <Navbar />
        <TabBar tabs={VIEWS} activeId={activeViewId} onSelect={setActiveViewId} />
        {ActiveView && <ActiveView />}
      </div>
    </AppContextProvider>
  )
}
