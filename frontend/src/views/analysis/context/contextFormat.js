/**
 * Module: contextFormat
 * Purpose: Formatting helpers for Context Analysis times, which arrive as
 *          seconds (relative offsets and epoch seconds). Pure functions.
 * Owner: Full Stack team
 */
import { formatDateTime } from '../../../lib/format.js'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
// Below this many seconds a span reads better in seconds than in minutes.
const SECONDS_DISPLAY_LIMIT = 120
// Below this many minutes a span reads better in minutes than in hours.
const MINUTES_DISPLAY_LIMIT = 120
const RELATIVE_DECIMALS = 3

/**
 * Format a span length for people: ms, s, min or h.
 * @param {number} durationS Span in seconds.
 * @returns {string}
 */
export function formatSpan(durationS) {
  const seconds = Number(durationS)
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 1) return `${(seconds * MS_PER_SECOND).toFixed(0)} ms`
  if (seconds < SECONDS_DISPLAY_LIMIT) return `${seconds.toFixed(RELATIVE_DECIMALS)} s`
  const minutes = seconds / SECONDS_PER_MINUTE
  if (minutes < MINUTES_DISPLAY_LIMIT) return `${minutes.toFixed(1)} min`
  return `${(minutes / MINUTES_PER_HOUR).toFixed(1)} h`
}

/**
 * @param {number} offsetS Offset from the first event, in seconds.
 * @returns {string} e.g. "4.102s"
 */
export function formatRelativeSeconds(offsetS) {
  return `${Number(offsetS).toFixed(RELATIVE_DECIMALS)}s`
}

/**
 * @param {number} epochS Unix time in seconds.
 * @returns {string} Local YYYY-MM-DD HH:MM:SS.
 */
export function formatEpochSeconds(epochS) {
  return formatDateTime(new Date(Number(epochS) * MS_PER_SECOND))
}
