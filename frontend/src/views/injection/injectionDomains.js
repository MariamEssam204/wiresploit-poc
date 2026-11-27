/**
 * Module: injectionDomains
 * Purpose: The injection domains shown as sub-tabs of the Injection view.
 *          Their pages live in the standalone injection-ui folder, kept
 *          separate so the Injection team can keep working on it.
 * Owner: Full Stack team
 *
 * Currently NOT rendered: the Injection tab shows the live packet page
 * instead (see InjectionView.jsx). This list is kept for when the domain
 * pages are needed again.
 *
 * To add a domain (e.g. SPI): build its page in injection-ui/pages/, import
 * it below, and add { id, label, component }. The page receives
 * { isCapturing }.
 */
import NetworkInjection from '../../../injection-ui/pages/NetworkInjection'
import UartInjection from '../../../injection-ui/pages/UartInjection'

export const INJECTION_DOMAINS = [
  { id: 'network', label: 'Network', component: NetworkInjection },
  { id: 'uart', label: 'UART', component: UartInjection },
]

/**
 * @param {string} domainId
 * @returns {object | undefined} The registered domain with that id.
 */
export function findDomainById(domainId) {
  return INJECTION_DOMAINS.find((domain) => domain.id === domainId)
}
