/**
 * Module: FindingsEngine
 * Purpose: Findings and credential scan. Runs the scan engine (Backend
 *          /api/findings) and shows summary tiles, the findings table,
 *          regex traceability, and the details of the selected finding.
 * Owner: Full Stack team
 */
import { useCallback, useEffect, useState } from 'react'
import { useAppContext } from '../../../app/AppContext.jsx'
import { readFindings } from '../../../api/client.js'
import LaneTag from '../../../components/LaneTag.jsx'
import { formatDateTime } from '../../../lib/format.js'
import { buildDistinctList, buildMaskedValue, getSeverityForType } from './findingRules.js'
import './findings.css'

export default function FindingsEngine() {
  const { navigation } = useAppContext()
  const [scanResult, setScanResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const runScan = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      setScanResult(await readFindings())
      setSelectedIndex(0)
    } catch (error) {
      setLoadError(String(error.message || error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    runScan()
  }, [runScan])

  const findings = scanResult ? scanResult.findings : []
  const totalOccurrences = findings.reduce((sum, finding) => sum + finding.count, 0)
  const selectedFinding = findings[selectedIndex] || null
  const hasNoFindings = !isLoading && scanResult && findings.length === 0

  return (
    <div className="engine-page">
      <div className="view-header">
        <div className="titles">
          <h2>Findings and credential scan</h2>
          <div className="subtitle">Regex detection engine · Elasticsearch source</div>
        </div>
        <ScanStatus isLoading={isLoading} loadError={loadError} />
        <button className="btn" onClick={runScan} disabled={isLoading}>
          Re-scan
        </button>
      </div>

      <div className="engine-page-body">
        <div className="stat-tiles">
          <StatTile label="Packets scanned" value={scanResult ? scanResult.packets_scanned.toLocaleString() : '—'} />
          <StatTile label="Unique findings" value={findings.length} />
          <StatTile label="Total occurrences" value={totalOccurrences} />
          <StatTile label="Rules loaded" value={scanResult ? scanResult.rules_loaded : '—'} />
        </div>

        {loadError && <div className="placeholder">Scan failed: {loadError}</div>}
        {hasNoFindings && <div className="placeholder">No sensitive patterns detected in the database.</div>}

        {findings.length > 0 && (
          <div className="findings-layout">
            <div className="findings-main">
              <div className="section-title">Security findings</div>
              <FindingsTable
                findings={findings}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />

              <div className="section-title">Regex detection · traceability</div>
              <TraceList findings={findings} />
            </div>

            <aside className="findings-side">
              <div className="section-title">Finding details</div>
              {selectedFinding ? (
                <FindingDetails finding={selectedFinding} onShowPacket={navigation.showPacket} />
              ) : (
                <div className="faint">Select a finding.</div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function ScanStatus({ isLoading, loadError }) {
  if (isLoading) return <span className="status-badge is-pending">Scanning</span>
  if (loadError) return <span className="status-badge is-err">Scan failed</span>
  return <span className="status-badge is-ok">Scan complete</span>
}

function StatTile({ label, value }) {
  return (
    <div className="stat-tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

function FindingsTable({ findings, selectedIndex, onSelect }) {
  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Value</th>
            <th>Occ.</th>
            <th>Bus</th>
            <th>Protocol</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding, index) => {
            const severity = getSeverityForType(finding.finding_type)
            const buses = buildDistinctList(finding.occurrences.map((occurrence) => occurrence.bus))
            const protocols = buildDistinctList(finding.occurrences.map((occurrence) => occurrence.protocol))
            return (
              <tr
                key={index}
                className={'is-clickable' + (index === selectedIndex ? ' is-selected' : '')}
                onClick={() => onSelect(index)}
              >
                <td>{finding.finding_type}</td>
                <td className="mono">{buildMaskedValue(finding)}</td>
                <td className="mono">{finding.count}</td>
                <td>{buses ? <LaneTag name={buses} /> : '—'}</td>
                <td>{protocols || '—'}</td>
                <td>
                  <span className={`severity is-${severity.id}`}>{severity.label}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TraceList({ findings }) {
  return (
    <div className="trace-list">
      {findings.map((finding, index) => {
        const firstOccurrence = finding.occurrences[0]
        return (
          <div className="trace-row" key={index}>
            <div className="trace-context mono">
              {firstOccurrence ? buildMarkedText(firstOccurrence.context, finding.value) : finding.value}
            </div>
            <div className="trace-meta">
              Regex rule <span className="mono trace-rule">{finding.rule}</span>
              {finding.is_fallback ? (
                <span className="trace-fallback">Fallback rule</span>
              ) : (
                <>
                  → finding <b className="mono">{finding.value}</b>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FindingDetails({ finding, onShowPacket }) {
  return (
    <>
      <dl className="kv-grid">
        <dt>Type</dt>
        <dd>{finding.finding_type}</dd>
        <dt>Detected value</dt>
        <dd>{finding.value}</dd>
        <dt>Rule matched</dt>
        <dd>{finding.rule}</dd>
        <dt>Occurrences</dt>
        <dd>{finding.count}</dd>
      </dl>

      <div className="section-title occurrence-title">Occurrences</div>
      {finding.occurrences.map((occurrence, index) => (
        <div className="occurrence" key={index}>
          <button className="link" onClick={() => onShowPacket(occurrence.record_id)}>
            Occurrence {index + 1} · show in timeline
          </button>
          <div>
            Record <b className="mono">{occurrence.record_id}</b>
          </div>
          <div>Time {occurrence.ts == null ? '—' : formatDateTime(new Date(Number(occurrence.ts)))}</div>
          <div>
            Bus <b>{occurrence.bus || '—'}</b> · Protocol <b>{occurrence.protocol || '—'}</b>
          </div>
          <div className="mono faint">
            Offset {occurrence.offset}–{occurrence.end_offset} · payload_ascii
          </div>
        </div>
      ))}
    </>
  )
}

// Wrap each case-insensitive occurrence of `value` inside `text` in <mark>.
function buildMarkedText(text, value) {
  if (!text || !value) return text || ''
  const parts = []
  const lowerText = text.toLowerCase()
  const lowerValue = value.toLowerCase()
  let searchFrom = 0
  let matchStart = lowerText.indexOf(lowerValue, searchFrom)
  while (matchStart >= 0) {
    if (matchStart > searchFrom) parts.push(text.slice(searchFrom, matchStart))
    parts.push(<mark key={matchStart}>{text.slice(matchStart, matchStart + value.length)}</mark>)
    searchFrom = matchStart + value.length
    matchStart = lowerText.indexOf(lowerValue, searchFrom)
  }
  parts.push(text.slice(searchFrom))
  return parts
}
