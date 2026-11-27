/**
 * Module: ContextAnalysis
 * Purpose: Context Analysis engine page: runs the engine, shows summary
 *          pills and a lane legend, the sequence diagram, and the
 *          slide-over details panel.
 * Owner: Full Stack team
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/AppContext.jsx'
import { readContextAnalysis } from '../../../api/client.js'
import { LaneSwatch } from '../../../components/LaneTag.jsx'
import { useMeasuredWidth } from '../../../hooks/useMeasuredWidth.js'
import ContextPanel, { PANEL_TABS } from './ContextPanel.jsx'
import SequenceDiagram from './SequenceDiagram.jsx'
import { buildSequenceLayout } from './sequenceLayout.js'
import './context.css'

const SELECTION_KIND = {
  EVENT: 'event',
  ACTIVITY: 'activity',
}
// Leave a little room above an activity when scrolling it into view.
const SCROLL_MARGIN_PX = 40
const ESCAPE_KEY = 'Escape'

export default function ContextAnalysis() {
  const { navigation } = useAppContext()
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  // { kind: SELECTION_KIND.*, id } or null.
  const [selection, setSelection] = useState(null)
  const [panelTab, setPanelTab] = useState(PANEL_TABS.DETAILS)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [canvasRef, canvasWidthPx, canvasElement] = useMeasuredWidth()

  const runAnalysis = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await readContextAnalysis()
      if (result.error) throw new Error(result.error)
      setAnalysis(result)
      setSelection(null)
    } catch (error) {
      setLoadError(String(error.message || error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    runAnalysis()
  }, [runAnalysis])

  // Escape closes the panel, matching the rest of the app's overlays.
  useEffect(() => {
    if (!isPanelOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === ESCAPE_KEY) setIsPanelOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPanelOpen])

  const layout = useMemo(() => buildSequenceLayout(analysis, canvasWidthPx), [analysis, canvasWidthPx])

  const eventsById = useMemo(() => {
    const map = new Map()
    analysis?.events.forEach((event) => map.set(event.event_id, event))
    return map
  }, [analysis])

  const activitiesByCluster = useMemo(() => {
    const map = new Map()
    analysis?.activities.forEach((activity) => map.set(activity.cluster, activity))
    return map
  }, [analysis])

  const showEvent = useCallback((eventId) => {
    setSelection({ kind: SELECTION_KIND.EVENT, id: eventId })
    setPanelTab(PANEL_TABS.DETAILS)
    setIsPanelOpen(true)
  }, [])

  // Selecting an activity also scrolls the diagram to it: the canvas can be
  // tens of thousands of pixels tall, so the box is rarely already in view.
  const showActivity = useCallback(
    (cluster) => {
      setSelection({ kind: SELECTION_KIND.ACTIVITY, id: cluster })
      setPanelTab(PANEL_TABS.DETAILS)
      setIsPanelOpen(true)
      const group = layout?.groups.find((candidate) => candidate.activity.cluster === cluster)
      if (group && canvasElement) {
        canvasElement.scrollTo({ top: Math.max(group.y - SCROLL_MARGIN_PX, 0), behavior: 'smooth' })
      }
    },
    [layout, canvasElement],
  )

  const highlightedCluster = selection?.kind === SELECTION_KIND.ACTIVITY ? selection.id : null
  const selectedEvent = selection?.kind === SELECTION_KIND.EVENT ? eventsById.get(selection.id) : null
  const selectedActivity =
    selection?.kind === SELECTION_KIND.ACTIVITY ? activitiesByCluster.get(selection.id) : null
  const stats = analysis?.stats
  const hasEvents = Boolean(analysis?.events.length)

  return (
    <div className="engine-page">
      <div className="view-header">
        <div className="titles">
          <h2>Behavior and context sequence</h2>
          <div className="subtitle">Captured event order with correlated activities · Elasticsearch source</div>
        </div>

        {stats && (
          <>
            <span className="stat-pill">
              <b>{stats.events.toLocaleString()}</b> events
            </span>
            <span className="stat-pill">
              <b>{stats.activities}</b> activities
            </span>
            <span className="stat-pill">
              <b>{stats.endpoints}</b> endpoints
            </span>
          </>
        )}

        <div className="ctx-legend">
          {(analysis?.protocols ?? []).map((protocol) => (
            <span className="lane-tag" key={protocol}>
              <LaneSwatch name={protocol} />
              {protocol}
            </span>
          ))}
        </div>

        <button className="btn btn-ghost" onClick={runAnalysis} disabled={isLoading}>
          {isLoading ? 'Analyzing…' : 'Re-run'}
        </button>
        <button className="btn" onClick={() => setIsPanelOpen((isOpen) => !isOpen)} disabled={!analysis}>
          {isPanelOpen ? 'Close panel' : 'Open panel'}
        </button>
      </div>

      {loadError ? (
        <div className="placeholder">Context analysis failed: {loadError}</div>
      ) : isLoading && !analysis ? (
        <div className="placeholder">Correlating captured events…</div>
      ) : !hasEvents ? (
        <div className="placeholder">No events in the datastore yet. Capture some traffic, then re-run.</div>
      ) : (
        <div className="ctx-stage">
          <div className="ctx-canvas" ref={canvasRef}>
            {layout && (
              <SequenceDiagram
                layout={layout}
                highlightedCluster={highlightedCluster}
                selectedEventId={selectedEvent?.event_id}
                onSelectEvent={showEvent}
                onSelectActivity={showActivity}
              />
            )}
          </div>

          <ContextPanel
            isOpen={isPanelOpen}
            onClose={() => setIsPanelOpen(false)}
            activeTab={panelTab}
            onTabChange={setPanelTab}
            activities={analysis.activities}
            selectedEvent={selectedEvent}
            selectedActivity={selectedActivity}
            highlightedCluster={highlightedCluster}
            onSelectActivity={showActivity}
            onShowPacket={navigation.showPacket}
          />
        </div>
      )}
    </div>
  )
}
