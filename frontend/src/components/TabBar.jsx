/**
 * Module: TabBar
 * Purpose: One tab strip for every level of navigation: the main views,
 *          the opened analysis engines, and the injection domains.
 * Owner: Full Stack team
 */
import './TabBar.css'

/**
 * @param {object} props
 * @param {{id: string, label: string, isClosable?: boolean}[]} props.tabs Tabs in display order.
 * @param {string} props.activeId Id of the selected tab.
 * @param {(id: string) => void} props.onSelect Called with the clicked tab id.
 * @param {(id: string) => void} [props.onClose] Called when a closable tab's x is clicked.
 * @param {'primary' | 'secondary'} [props.variant='primary'] Primary = main views,
 *   secondary = sub-navigation inside a view.
 * @param {import('react').ReactNode} [props.trailing] Extra content on the right.
 */
export default function TabBar({ tabs, activeId, onSelect, onClose, variant = 'primary', trailing }) {
  const handleClose = (event, tabId) => {
    // Stop the click from also selecting the tab that is being closed.
    event.stopPropagation()
    onClose?.(tabId)
  }

  return (
    <nav className={`tabbar tabbar-${variant}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={'tab' + (isActive ? ' is-active' : '')}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
            {tab.isClosable && (
              <span
                className="tab-close"
                role="button"
                aria-label={`Close ${tab.label}`}
                onClick={(event) => handleClose(event, tab.id)}
              >
                ×
              </span>
            )}
          </button>
        )
      })}
      {trailing && <div className="tabbar-trailing">{trailing}</div>}
    </nav>
  )
}
