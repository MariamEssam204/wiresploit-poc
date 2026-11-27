/**
 * Module: FilterBar
 * Purpose: Search box, event-type filter chips, auto-scroll toggle and the
 *          live/search counters above the packet table.
 * Owner: Full Stack team
 */
import { LaneSwatch } from '../../components/LaneTag.jsx'

/**
 * @param {object} props
 * @param {string} props.searchTerm
 * @param {(term: string) => void} props.onSearchTermChange
 * @param {string[]} props.eventTypes Event types present in the current data.
 * @param {Set<string>} props.hiddenEventTypes Event types toggled off.
 * @param {(eventType: string) => void} props.onToggleEventType
 * @param {boolean} props.shouldAutoScroll
 * @param {(value: boolean) => void} props.onAutoScrollChange
 * @param {boolean} props.isSearchMode True while showing search results.
 * @param {boolean} props.isSearching True while a search request is running.
 * @param {number} props.matchCount Rows after filtering.
 * @param {boolean} props.isConnected Live stream connection state.
 */
export default function FilterBar({
  searchTerm,
  onSearchTermChange,
  eventTypes,
  hiddenEventTypes,
  onToggleEventType,
  shouldAutoScroll,
  onAutoScrollChange,
  isSearchMode,
  isSearching,
  matchCount,
  isConnected,
}) {
  const matchLabel = matchCount === 1 ? 'match' : 'matches'

  return (
    <div className="filterbar">
      <div className="search-box">
        <SearchIcon />
        <input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search inside payloads, e.g. a credential"
          aria-label="Search payloads"
        />
        {searchTerm && (
          <button className="btn-icon btn" onClick={() => onSearchTermChange('')} aria-label="Clear search">
            ×
          </button>
        )}
      </div>

      {eventTypes.map((eventType) => {
        const isOn = !hiddenEventTypes.has(eventType)
        return (
          <button
            key={eventType}
            className={'chip' + (isOn ? ' is-on' : '')}
            onClick={() => onToggleEventType(eventType)}
            aria-pressed={isOn}
          >
            <LaneSwatch name={eventType} />
            {eventType}
          </button>
        )
      })}

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={shouldAutoScroll}
          onChange={(event) => onAutoScrollChange(event.target.checked)}
        />
        Auto-scroll
      </label>

      <span className="filterbar-count">
        {isSearchMode
          ? `${isSearching ? '…' : matchCount} ${matchLabel} in Elasticsearch`
          : `${matchCount.toLocaleString()} live`}
      </span>

      <span className={'stream-state' + (isConnected ? ' is-connected' : '')}>
        <span className="stream-dot" />
        {isConnected ? 'Stream connected' : 'Stream offline'}
      </span>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
