/**
 * Module: AnalysisView
 * Purpose: Analysis tab. The overview shows one card per registered engine;
 *          opening a card adds a closable sub-tab for that engine.
 * Owner: Full Stack team
 */
import { useState } from 'react'
import TabBar from '../../components/TabBar.jsx'
import { ENGINES, findEngineById } from './engineRegistry.js'
import './analysis.css'

const OVERVIEW_TAB_ID = 'overview'

export default function AnalysisView() {
  const [openEngineIds, setOpenEngineIds] = useState([])
  const [activeTabId, setActiveTabId] = useState(OVERVIEW_TAB_ID)

  const openEngine = (engineId) => {
    setOpenEngineIds((previous) => (previous.includes(engineId) ? previous : [...previous, engineId]))
    setActiveTabId(engineId)
  }

  const closeEngine = (engineId) => {
    setOpenEngineIds((previous) => previous.filter((openId) => openId !== engineId))
    setActiveTabId((current) => (current === engineId ? OVERVIEW_TAB_ID : current))
  }

  const tabs = [
    { id: OVERVIEW_TAB_ID, label: 'All engines' },
    ...openEngineIds.map((engineId) => ({
      id: engineId,
      label: findEngineById(engineId).name,
      isClosable: true,
    })),
  ]

  const ActiveEngine = findEngineById(activeTabId)?.component

  return (
    <div className="view">
      <TabBar
        variant="secondary"
        tabs={tabs}
        activeId={activeTabId}
        onSelect={setActiveTabId}
        onClose={closeEngine}
      />
      {ActiveEngine ? <ActiveEngine /> : <EngineOverview onOpenEngine={openEngine} />}
    </div>
  )
}

function EngineOverview({ onOpenEngine }) {
  return (
    <div className="engine-overview">
      <div className="engine-overview-head">
        <h2>Analysis engines</h2>
        <p>Each engine reads the stored events and returns a result. Open one to run it.</p>
      </div>
      <div className="engine-grid">
        {ENGINES.map((engine, index) => (
          <button className="engine-card" key={engine.id} onClick={() => onOpenEngine(engine.id)}>
            <span className="engine-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="engine-name">{engine.name}</span>
            <span className="engine-description">{engine.description}</span>
            <span className="engine-open">Open →</span>
          </button>
        ))}
      </div>
    </div>
  )
}
