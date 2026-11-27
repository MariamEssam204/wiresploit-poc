/**
 * Module: format
 * Purpose: Formatting and parsing helpers shared across the UI (clocks,
 *          durations, hex bytes, previews). Pure functions, no I/O.
 * Owner: Full Stack team
 */

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3600
const MINUTES_PER_HOUR = 60
const PSF_PREVIEW_MAX_CHARS = 60
const HEX_PAIR_LENGTH = 2
const HEX_RADIX = 16
const PRINTABLE_ASCII_MIN = 32
const PRINTABLE_ASCII_MAX = 126
const NON_PRINTABLE_PLACEHOLDER = '.'

function padNumber(value, width) {
  return String(value).padStart(width, '0')
}

/**
 * Format an elapsed time as HH:MM:SS (the session clock).
 * @param {number} durationMs Elapsed time in milliseconds.
 * @returns {string}
 */
export function formatSessionClock(durationMs) {
  const totalSeconds = Math.floor(durationMs / MS_PER_SECOND)
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(seconds, 2)}`
}

/**
 * Format a timestamp as local HH:MM:SS.mmm.
 * @param {string | number} timestamp ISO string or epoch milliseconds.
 * @returns {string} The clock time, or the raw value if it cannot be parsed.
 */
export function formatClockTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return String(timestamp ?? '')
  return (
    `${padNumber(date.getHours(), 2)}:${padNumber(date.getMinutes(), 2)}:` +
    `${padNumber(date.getSeconds(), 2)}.${padNumber(date.getMilliseconds(), 3)}`
  )
}

/**
 * Format a timestamp as local YYYY-MM-DD HH:MM:SS.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (Number.isNaN(date.getTime())) return '—'
  return (
    `${date.getFullYear()}-${padNumber(date.getMonth() + 1, 2)}-${padNumber(date.getDate(), 2)} ` +
    `${padNumber(date.getHours(), 2)}:${padNumber(date.getMinutes(), 2)}:${padNumber(date.getSeconds(), 2)}`
  )
}

/**
 * Get a packet's timestamp as a comparable number, for sorting.
 * @param {{timestamp?: string | number}} packet
 * @returns {number} Epoch milliseconds, or 0 if missing.
 */
export function getTimestampMs(packet) {
  const timestamp = packet?.timestamp
  if (typeof timestamp === 'number') return timestamp
  const parsedMs = Date.parse(timestamp)
  return Number.isNaN(parsedMs) ? 0 : parsedMs
}

/**
 * Build a one-line preview of the protocol-specific fields (PSF) JSON.
 * @param {object} psf
 * @returns {string}
 */
export function buildPsfPreview(psf) {
  if (!psf || typeof psf !== 'object') return ''
  if (Object.keys(psf).length === 0) return '{}'
  const json = JSON.stringify(psf)
  if (json.length <= PSF_PREVIEW_MAX_CHARS) return json
  return json.slice(0, PSF_PREVIEW_MAX_CHARS - 1) + '…'
}

/**
 * Format a number as upper-case hex, zero-padded.
 * @param {number} value
 * @param {number} [width=2] Minimum number of hex digits.
 * @returns {string}
 */
export function formatHex(value, width = HEX_PAIR_LENGTH) {
  return value.toString(HEX_RADIX).toUpperCase().padStart(width, '0')
}

/**
 * Parse a hex string ("70617373" or "70 61:73") into bytes.
 * @param {string} hexText
 * @returns {number[]} Byte values 0-255; invalid pairs are skipped.
 */
export function parseHexBytes(hexText) {
  const cleanHex = (hexText || '').replace(/[\s:]/g, '')
  const bytes = []
  for (let index = 0; index + 1 < cleanHex.length; index += HEX_PAIR_LENGTH) {
    const byteValue = parseInt(cleanHex.slice(index, index + HEX_PAIR_LENGTH), HEX_RADIX)
    if (!Number.isNaN(byteValue)) bytes.push(byteValue)
  }
  return bytes
}

/**
 * Turn bytes into printable ASCII, with '.' for anything non-printable.
 * @param {number[]} bytes
 * @returns {string}
 */
export function buildAsciiPreview(bytes) {
  return bytes
    .map((byteValue) =>
      byteValue >= PRINTABLE_ASCII_MIN && byteValue <= PRINTABLE_ASCII_MAX
        ? String.fromCharCode(byteValue)
        : NON_PRINTABLE_PLACEHOLDER,
    )
    .join('')
}

/**
 * Find every character index covered by a case-insensitive search term.
 * @param {string} text Text to search.
 * @param {string} term Search term; empty means no matches.
 * @returns {Set<number>} Indexes inside `text` that are part of a match.
 */
export function findMatchIndexes(text, term) {
  const matchIndexes = new Set()
  const lowerTerm = (term || '').toLowerCase()
  if (!lowerTerm) return matchIndexes
  const lowerText = text.toLowerCase()
  let searchFrom = 0
  while (true) {
    const matchStart = lowerText.indexOf(lowerTerm, searchFrom)
    if (matchStart < 0) break
    for (let index = matchStart; index < matchStart + lowerTerm.length; index++) {
      matchIndexes.add(index)
    }
    searchFrom = matchStart + lowerTerm.length
  }
  return matchIndexes
}
