/**
 * Module: engineRegistry
 * Purpose: The analysis engines shown as cards in the Analysis view. Each
 *          card opens its engine in a closable sub-tab.
 * Owner: Full Stack team
 *
 * To add an engine:
 *   1. Create src/views/analysis/<name>/<Name>Engine.jsx. It takes no
 *      props; use useAppContext() for navigation (e.g. showPacket).
 *   2. Import it below and add { id, name, description, component }.
 */
import FindingsEngine from './findings/FindingsEngine.jsx'
import ContextAnalysis from './context/ContextAnalysis.jsx'

export const ENGINES = [
  {
    id: 'findings',
    name: 'Findings',
    description: 'Credentials, keys and other sensitive values found in captured payloads.',
    component: FindingsEngine,
  },
  {
    id: 'context-analysis',
    name: 'Context analysis',
    description: 'Behavior diagram of endpoints and events, grouped into correlated activities.',
    component: ContextAnalysis,
  },
]

/**
 * @param {string} engineId
 * @returns {object | undefined} The registered engine with that id.
 */
export function findEngineById(engineId) {
  return ENGINES.find((engine) => engine.id === engineId)
}
