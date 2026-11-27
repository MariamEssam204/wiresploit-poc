/**
 * Module: sequenceLayout
 * Purpose: Compute the geometry of the behavior / context sequence diagram:
 *          endpoint columns, one row per event, and the box bounds of each
 *          activity. Pure functions, no rendering.
 * Owner: Full Stack team
 *
 * Layout is computed in the UI rather than in the Backend so the analysis
 * engine stays a pure data producer (see backend/app/context_analysis.py).
 */

export const LAYOUT = {
  // Space kept clear either side so edge chips never clip.
  gutterPx: 96,
  // Stops 2-3 endpoints from stretching absurdly wide.
  maxColumnSpacingPx: 260,
  // Tighter than this and chips alternate over two rows.
  staggerBelowPx: 118,
  chipMaxWidthPx: 176,
  chipMinWidthPx: 44,
  chipHeightPx: 32,
  chipTopPx: 16,
  chipLabelPaddingPx: 12,
  staggerOffsetPx: 40,
  lifelineGapPx: 6,
  headerToFirstRowPx: 64,
  rowHeightPx: 62,
  groupPaddingPx: 18,
  groupLabelHeightPx: 26,
  selfLoopWidthPx: 55,
  selfLoopDropPx: 32,
  arrowLabelPaddingPx: 18,
  bottomPaddingPx: 60,
  minUsableWidthPx: 120,
  // About one character of the 12px mono face, for fitting labels.
  charWidthPx: 6.6,
}

/**
 * Truncate a label to fit a width, since SVG text has no ellipsis. The full
 * value stays reachable through a <title> tooltip.
 * @param {string} text
 * @param {number} maxWidthPx
 * @returns {string} The text, shortened with an ellipsis if needed, or ''.
 */
export function fitTextToWidth(text, maxWidthPx) {
  const charBudget = Math.floor(maxWidthPx / LAYOUT.charWidthPx)
  if (charBudget >= text.length) return text
  return charBudget > 1 ? text.slice(0, charBudget - 1) + '…' : ''
}

/**
 * Build the diagram layout for the available width.
 *
 * Horizontal geometry is derived from the width actually available, so the
 * diagram always fits: columns compress instead of overflowing, and nothing
 * scrolls sideways. Text is never scaled; it stays at its CSS size and is
 * truncated when a column gets too narrow, because a viewBox-scaled diagram
 * would shrink labels into illegibility.
 *
 * @param {{events: object[], endpoints: string[], activities: object[]} | null} analysis
 * @param {number} viewWidthPx Width of the canvas in CSS pixels.
 * @returns {object | null} Lifelines, rows, groups and overall size, or null
 *   when there is nothing to draw yet.
 */
export function buildSequenceLayout(analysis, viewWidthPx) {
  if (!analysis || !analysis.events.length || viewWidthPx <= 0) return null
  const { events, endpoints, activities } = analysis

  const columnCount = Math.max(endpoints.length - 1, 0)
  const usableWidthPx = Math.max(viewWidthPx - LAYOUT.gutterPx * 2, LAYOUT.minUsableWidthPx)
  const columnSpacingPx = columnCount
    ? Math.min(LAYOUT.maxColumnSpacingPx, usableWidthPx / columnCount)
    : 0

  // When the spacing cap applies (few endpoints), centre the block rather
  // than leaving all the slack on the right.
  const originX = LAYOUT.gutterPx + Math.max(usableWidthPx - columnSpacingPx * columnCount, 0) / 2

  // Alternating two rows doubles the width each chip can use, which keeps
  // full IP addresses readable at tight spacings.
  const shouldStagger = columnCount > 0 && columnSpacingPx < LAYOUT.staggerBelowPx
  const chipWidthPx = Math.max(
    LAYOUT.chipMinWidthPx,
    Math.min(
      LAYOUT.chipMaxWidthPx,
      (shouldStagger ? columnSpacingPx * 2 : columnSpacingPx) - LAYOUT.chipLabelPaddingPx,
    ),
  )

  const getChipTop = (index) =>
    LAYOUT.chipTopPx + (shouldStagger && index % 2 ? LAYOUT.staggerOffsetPx : 0)
  const headerBottomPx =
    LAYOUT.chipTopPx + (shouldStagger ? LAYOUT.staggerOffsetPx : 0) + LAYOUT.chipHeightPx
  const firstRowY = headerBottomPx + LAYOUT.headerToFirstRowPx

  const lifelines = endpoints.map((endpoint, index) => {
    const chipTop = getChipTop(index)
    const label = fitTextToWidth(endpoint, chipWidthPx - LAYOUT.chipLabelPaddingPx)
    return {
      endpoint,
      x: originX + index * columnSpacingPx,
      chipTop,
      lifelineTop: chipTop + LAYOUT.chipHeightPx + LAYOUT.lifelineGapPx,
      label,
      isTruncated: label !== endpoint,
    }
  })

  const xByEndpoint = {}
  lifelines.forEach((lifeline) => {
    xByEndpoint[lifeline.endpoint] = lifeline.x
  })

  const rows = events.map((event, index) => {
    const fromX = xByEndpoint[event.source] ?? originX
    const toX = xByEndpoint[event.destination] ?? originX
    const isSelfMessage = fromX === toX
    return {
      event,
      y: firstRowY + index * LAYOUT.rowHeightPx,
      fromX,
      toX,
      isSelfMessage,
      // Room for the arrow's caption: the span it crosses, or the gap to the
      // right of a self-loop.
      labelMaxWidthPx: isSelfMessage
        ? columnSpacingPx - LAYOUT.chipLabelPaddingPx
        : Math.abs(toX - fromX) - LAYOUT.arrowLabelPaddingPx,
    }
  })

  const boundsByCluster = new Map()
  rows.forEach(({ event, y }) => {
    const bounds = boundsByCluster.get(event.cluster)
    if (!bounds) boundsByCluster.set(event.cluster, { top: y, bottom: y })
    else bounds.bottom = y
  })

  const groups = activities
    .filter((activity) => boundsByCluster.has(activity.cluster))
    .map((activity) => {
      const bounds = boundsByCluster.get(activity.cluster)
      const top = bounds.top - LAYOUT.groupPaddingPx
      return {
        activity,
        y: top,
        height: bounds.bottom + LAYOUT.groupPaddingPx - top + LAYOUT.groupLabelHeightPx,
      }
    })

  return {
    lifelines,
    rows,
    groups,
    chipWidthPx,
    widthPx: viewWidthPx,
    heightPx: firstRowY + rows.length * LAYOUT.rowHeightPx + LAYOUT.bottomPaddingPx,
  }
}
