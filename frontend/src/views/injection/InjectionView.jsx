/**
 * Module: InjectionView
 * Purpose: Injection tab: one sub-tab per registered injection domain.
 *          The domain pages come from the standalone injection-ui folder;
 *          their services call /api/injection, which is proxied to the
 *          injection backend. Styling uses this app's theme.
 * Owner: Full Stack team
 */
import { useState } from 'react'
import { useAppContext } from '../../app/AppContext.jsx'
import TabBar from '../../components/TabBar.jsx'
import { INJECTION_DOMAINS, findDomainById } from './injectionDomains.js'
import './injection.css'

export default function InjectionView() {
  const { capture } = useAppContext()
  const [activeDomainId, setActiveDomainId] = useState(INJECTION_DOMAINS[0].id)
  const ActiveDomain = findDomainById(activeDomainId)?.component

  return (
    <div className="view injection-view">
      <TabBar
        variant="secondary"
        tabs={INJECTION_DOMAINS}
        activeId={activeDomainId}
        onSelect={setActiveDomainId}
        trailing={<span className="injection-hint">PC-local, or an optional Injection Node</span>}
      />
      {ActiveDomain && <ActiveDomain isCapturing={capture.isCapturing} />}
    </div>
  )
}
