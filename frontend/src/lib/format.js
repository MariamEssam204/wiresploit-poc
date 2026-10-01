// Small formatting/helpers shared across the UI.

const pad = (n, l) => String(n).padStart(l, '0')

// ms -> HH:MM:SS (session clock in the navbar).
export const fmtDuration = (ms) => {
  const s = Math.floor(ms / 1000)
  return `${pad(Math.floor(s / 3600), 2)}:${pad(Math.floor(s / 60) % 60, 2)}:${pad(s % 60, 2)}`
}

// A `timestamp` (date_nanos: ISO string or epoch number) -> HH:MM:SS.mmm.
export const fmtClock = (t) => {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return String(t ?? '')
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}.${pad(d.getMilliseconds(), 3)}`
}

// Comparable numeric value for a packet's timestamp (for sorting the timeline).
export const tsValue = (p) => {
  const t = p?.timestamp
  if (typeof t === 'number') return t
  const n = Date.parse(t)
  return Number.isNaN(n) ? 0 : n
}

// A compact one-line preview of the PSF JSON for the timeline column.
export const psfPreview = (psf) => {
  if (!psf || typeof psf !== 'object') return ''
  const keys = Object.keys(psf)
  if (keys.length === 0) return '{}'
  const s = JSON.stringify(psf)
  return s.length > 60 ? s.slice(0, 59) + '…' : s
}

export const toHex = (n, len = 2) => n.toString(16).toUpperCase().padStart(len, '0')

// hex string (continuous "70617373" or spaced "70 61") -> [0x70, 0x61, ...]
export const hexToBytes = (s) => {
  const clean = (s || '').replace(/[\s:]/g, '')
  const out = []
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const b = parseInt(clean.slice(i, i + 2), 16)
    if (!Number.isNaN(b)) out.push(b)
  }
  return out
}
