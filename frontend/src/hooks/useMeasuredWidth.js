/**
 * Module: useMeasuredWidth
 * Purpose: Track the content-box width of an element.
 * Owner: Full Stack team
 *
 * Deliberately a CALLBACK ref held in state, not a useRef: the measured
 * element may mount later (e.g. once data has loaded), so a ref plus a mount
 * effect would see a null node, bail out and never re-run, leaving the width
 * at 0. Keying the effect on the element attaches the observer whenever the
 * node actually appears. A ResizeObserver covers window resizes and browser
 * zoom alike, and fires once on observe() to seed the width.
 */
import { useEffect, useState } from 'react'

/**
 * @returns {[(element: HTMLElement | null) => void, number, HTMLElement | null]}
 *   A callback ref to attach, the width in CSS pixels, and the element.
 */
export function useMeasuredWidth() {
  const [element, setElement] = useState(null)
  const [widthPx, setWidthPx] = useState(0)

  useEffect(() => {
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => setWidthPx(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])

  return [setElement, widthPx, element]
}
