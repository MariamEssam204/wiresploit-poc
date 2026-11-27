/**
 * Module: viewRegistry
 * Purpose: The list of top-level views (tabs). App renders whatever is
 *          listed here, in this order.
 * Owner: Full Stack team
 *
 * To add a view:
 *   1. Create src/views/<name>/<Name>View.jsx. It takes no props; read
 *      capture state and navigation with useAppContext().
 *   2. Import it below and add { id, label, component } to VIEWS.
 */
import LiveTimeline from '../views/timeline/LiveTimeline.jsx'
import AnalysisView from '../views/analysis/AnalysisView.jsx'
import InjectionView from '../views/injection/InjectionView.jsx'

export const VIEW_IDS = {
  TIMELINE: 'timeline',
  ANALYSIS: 'analysis',
  INJECTION: 'injection',
}

export const VIEWS = [
  { id: VIEW_IDS.TIMELINE, label: 'Live timeline', component: LiveTimeline },
  { id: VIEW_IDS.ANALYSIS, label: 'Analysis engines', component: AnalysisView },
  { id: VIEW_IDS.INJECTION, label: 'Injection', component: InjectionView },
]

export const DEFAULT_VIEW_ID = VIEW_IDS.TIMELINE

/**
 * @param {string} viewId
 * @returns {object | undefined} The registered view with that id.
 */
export function findViewById(viewId) {
  return VIEWS.find((view) => view.id === viewId)
}
