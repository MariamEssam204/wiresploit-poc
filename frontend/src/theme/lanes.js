/**
 * Module: lanes
 * Purpose: Single source of the Wiresploit lane (bus) colours and the
 *          protocol-to-lane mapping, taken from the Brand Manual v1.0
 *          ("Lanes", on-dark values).
 * Owner: Full Stack team
 *
 * Every bus has one colour everywhere. Lane colours are for marks and
 * blocks only; text stays in ink or grey (Brand Manual, "No text in lane
 * colours"). Signal red is reserved for the primary action, a flagged
 * finding or an active injection.
 */

export const LANES = {
  network: { id: 'network', label: 'Network', color: '#3987E5' },
  uart: { id: 'uart', label: 'UART', color: '#C98500' },
  spi: { id: 'spi', label: 'SPI', color: '#199E70' },
  i2c: { id: 'i2c', label: 'I2C', color: '#9085E9' },
  wireless: { id: 'wireless', label: 'Wireless', color: '#D55181' },
  snapshot: { id: 'snapshot', label: 'Snapshot', color: '#A9AFB6' },
}

export const SIGNAL_COLOR = '#F2614C'
export const NEUTRAL_MARK_COLOR = '#8A9099'

// Names that appear in event_type / protocol fields, mapped to their lane.
// Network-layer and application protocols all ride the Network lane.
const LANE_ID_BY_NAME = {
  NETWORK: 'network',
  NET: 'network',
  ETHERNET: 'network',
  IP: 'network',
  IPV4: 'network',
  IPV6: 'network',
  ARP: 'network',
  ICMP: 'network',
  TCP: 'network',
  UDP: 'network',
  DNS: 'network',
  HTTP: 'network',
  HTTPS: 'network',
  TLS: 'network',
  MQTT: 'network',
  UART: 'uart',
  SPI: 'spi',
  I2C: 'i2c',
  WIRELESS: 'wireless',
  WIFI: 'wireless',
  BLE: 'wireless',
  SNAPSHOT: 'snapshot',
}

// Names that mark an injected (active) event rather than captured traffic.
const INJECTION_NAMES = new Set(['INJECTION', 'INJECT'])

/**
 * Find the lane a protocol or event type belongs to.
 * @param {string} name Protocol or event_type value, any case.
 * @returns {{id: string, label: string, color: string} | null} The lane, or
 *   null when the name is not a known bus.
 */
export function findLaneForName(name) {
  const laneId = LANE_ID_BY_NAME[String(name || '').toUpperCase()]
  return laneId ? LANES[laneId] : null
}

/**
 * @param {string} name Protocol or event_type value, any case.
 * @returns {boolean} True when the name marks an injected event.
 */
export function isInjectionName(name) {
  return INJECTION_NAMES.has(String(name || '').toUpperCase())
}

/**
 * Get the mark colour for a protocol or event type.
 * @param {string} name Protocol or event_type value, any case.
 * @returns {string} Hex colour: signal red for injections, the lane colour
 *   for known buses, and neutral grey for anything else.
 */
export function getMarkColorForName(name) {
  if (isInjectionName(name)) return SIGNAL_COLOR
  return findLaneForName(name)?.color ?? NEUTRAL_MARK_COLOR
}

/**
 * Write the lane colours onto :root as CSS variables (--lane-network, ...)
 * so the stylesheets read the same values as this module.
 */
export function applyLaneColorTokens() {
  const rootStyle = document.documentElement.style
  Object.values(LANES).forEach((lane) => {
    rootStyle.setProperty(`--lane-${lane.id}`, lane.color)
  })
  rootStyle.setProperty('--signal', SIGNAL_COLOR)
}
