import { useCallback, useEffect, useState } from 'react'
import { getFindings } from '../api/client.js'
import ContextAnalysis from './ContextAnalysis.jsx'

// Analysis tab. The root view shows clickable square boxes. Clicking one opens a
// child sub-tab (under Analysis) whose logic is provided later.
const BOXES = [
  { id: 'findings', name: 'Findings', question: 'Security findings from analysis of the DUT.' },
  { id: 'context-analysis', name: 'Context Analysis', question: 'Behavior diagram with predicted activity clusters.' },
]

export default function AnalysisEngines({ packets, onGotoPacket }) {
  const [openIds, setOpenIds] = useState([]) // boxes opened as child tabs
  const [active, setActive] = useState('root') // 'root' (grid) or a box id

  const openBox = (id) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setActive(id)
  }
  const closeBox = (id, e) => {
    e.stopPropagation()
    setOpenIds((prev) => prev.filter((x) => x !== id))
    setActive((cur) => (cur === id ? 'root' : cur))
  }

  const activeBox = BOXES.find((b) => b.id === active)

  return (
    <div className="engines-view">
      {/* Sub-navigation: the box grid plus one child tab per opened box. */}
      <div className="analysis-subnav">
        <button
          className={'an-tab' + (active === 'root' ? ' active' : '')}
          onClick={() => setActive('root')}
        >
          Analysis
        </button>
        {openIds.map((id) => {
          const box = BOXES.find((b) => b.id === id)
          return (
            <button
              key={id}
              className={'an-tab' + (active === id ? ' active' : '')}
              onClick={() => setActive(id)}
            >
              {box.name}
              <span className="an-close" onClick={(e) => closeBox(id, e)} title="Close tab">
                ×
              </span>
            </button>
          )
        })}
      </div>

      {active === 'root' ? (
        <div className="engine-squares">
          {BOXES.map((box) => (
            <button className="engine-square" key={box.id} onClick={() => openBox(box.id)}>
              <span className="sq-ico">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
                </svg>
              </span>
              <span className="sq-name">{box.name}</span>
              <span className="sq-q">{box.question}</span>
            </button>
          ))}
        </div>
      ) : activeBox?.id === 'findings' ? (
        <FindingsChild box={activeBox} onGotoPacket={onGotoPacket} />
      ) : activeBox?.id === 'context-analysis' ? (
        <ContextAnalysis onGotoPacket={onGotoPacket} />
      ) : null}
    </div>
  )
}

// --- Findings presentation helpers ---
const CRITICAL_TYPES = new Set(['private_key', 'certificate', 'openssh_private_key'])
const MEDIUM_TYPES = new Set(['username', 'session'])
const KEY_MATERIAL = new Set(['private_key', 'certificate', 'openssh_private_key'])

function severityOf(type) {
  if (CRITICAL_TYPES.has(type)) return 'critical'
  if (MEDIUM_TYPES.has(type)) return 'med'
  return 'high'
}
// Mask secret values in the table; show a readable prefix for key material.
function maskValue(f) {
  if (KEY_MATERIAL.has(f.finding_type)) return f.value.slice(0, 16) + '…'
  return '•'.repeat(10)
}
function uniq(list) {
  return [...new Set(list.filter(Boolean))].join(', ')
}
function fmtTime(ts) {
  if (ts == null) return '—'
  const n = typeof ts === 'number' ? ts : Number(ts)
  const d = new Date(n)
  if (Number.isNaN(d.getTime())) return String(ts)
  const p = (x, l = 2) => String(x).padStart(l, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
// Wrap occurrences of `value` in <mark> inside `text`.
function markValue(text, value) {
  if (!text || !value) return text || ''
  const parts = []
  const low = text.toLowerCase()
  const v = value.toLowerCase()
  let from = 0
  let at
  let k = 0
  while ((at = low.indexOf(v, from)) >= 0) {
    if (at > from) parts.push(text.slice(from, at))
    parts.push(<mark key={k++}>{text.slice(at, at + value.length)}</mark>)
    from = at + value.length
  }
  parts.push(text.slice(from))
  return parts
}

// Findings child tab: the Findings & Credential Scan dashboard. Runs the scan
// engine (backend /api/findings, over poc_index) and renders KPI tiles, a
// findings table, a selectable details panel, and regex traceability.
function FindingsChild({ onGotoPacket }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sel, setSel] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    getFindings()
      .then((d) => { setData(d); setSel(0) })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const findings = data ? data.findings : []
  const totalOcc = findings.reduce((n, f) => n + f.count, 0)
  const selected = findings[sel] || null

  return (
    <div className="fx">
      <div className="fx-head">
        <div>
          <h2>Findings and credential scan</h2>
          <div className="fx-sub">Regex detection engine · Elasticsearch source</div>
        </div>
        <button className={'fx-status' + (loading ? ' busy' : error ? ' err' : '')} onClick={load} disabled={loading}>
          {loading ? 'Scanning…' : error ? 'Scan failed' : 'Scan complete'}
        </button>
      </div>

      <div className="fx-tiles">
        <div className="fx-tile"><div className="t-label">Packets scanned</div><div className="t-value">{data ? data.packets_scanned.toLocaleString() : '—'}</div></div>
        <div className="fx-tile"><div className="t-label">Unique findings</div><div className="t-value">{findings.length}</div></div>
        <div className="fx-tile"><div className="t-label">Total occurrences</div><div className="t-value">{totalOcc}</div></div>
        <div className="fx-tile"><div className="t-label">Rules loaded</div><div className="t-value">{data ? data.rules_loaded : '—'}</div></div>
      </div>

      {!loading && data && findings.length === 0 ? (
        <div className="ec-placeholder">No sensitive patterns detected in the database.</div>
      ) : (
        <div className="fx-body">
          <div className="fx-main">
            <div className="fx-section-title">Security findings</div>
            <table className="fx-table">
              <thead>
                <tr><th>Type</th><th>Value</th><th>Occ.</th><th>Bus</th><th>Protocol</th><th>Severity</th></tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={i} className={i === sel ? 'sel' : ''} onClick={() => setSel(i)}>
                    <td>{f.finding_type}</td>
                    <td className="mono">{maskValue(f)}</td>
                    <td>{f.count}</td>
                    <td>{uniq(f.occurrences.map((o) => o.bus)) || '—'}</td>
                    <td>{uniq(f.occurrences.map((o) => o.protocol)) || '—'}</td>
                    <td><span className={'sev ' + severityOf(f.finding_type)}>{severityOf(f.finding_type) === 'critical' ? 'Critical' : severityOf(f.finding_type) === 'med' ? 'Medium' : 'High'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="fx-section-title">Regex detection <span className="faint">· traceability</span></div>
            <div className="fx-trace">
              {findings.map((f, i) => {
                const o = f.occurrences[0]
                return (
                  <div className="fx-trace-row" key={i}>
                    <div className="fx-trace-ctx mono">{o ? markValue(o.context, f.value) : f.value}</div>
                    <div className="fx-trace-meta">
                      → Regex rule: <span className="link">{f.rule}</span>
                      {f.is_fallback
                        ? <span className="badge-fallback">Fallback rule</span>
                        : <> → Finding: <b>{f.value}</b></>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="fx-side">
            <div className="fx-section-title">Finding details</div>
            {selected ? (
              <>
                <div className="fx-kv"><span>Type</span><b>{selected.finding_type}</b></div>
                <div className="fx-kv"><span>Detected value</span><b className="mono">{selected.value}</b></div>
                <div className="fx-kv"><span>Rule matched</span><span className="link">{selected.rule}</span></div>
                <div className="fx-kv"><span>Occurrences</span><b>{selected.count}</b></div>

                <div className="fx-occ-head">SAME UNIQUE FINDING</div>
                {selected.occurrences.map((o, j) => (
                  <div className="fx-occ" key={j}>
                    <div className="link" onClick={() => onGotoPacket(o.record_id)}>Occurrence {j + 1}</div>
                    <div>Record <b>{o.record_id}</b></div>
                    <div>Time {fmtTime(o.ts)}</div>
                    <div>Bus <b>{o.bus || '—'}</b> · Proto <b>{o.protocol || '—'}</b></div>
                    <div>Offset {o.offset}–{o.end_offset}</div>
                    <div>Source payload_ascii</div>
                  </div>
                ))}
              </>
            ) : (
              <div className="faint" style={{ padding: '4px 2px' }}>Select a finding.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
