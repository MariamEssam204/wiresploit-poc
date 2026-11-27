/**
 * Module: BrandMark
 * Purpose: The Wiresploit logo for dark backgrounds: the timeline mark
 *          (four wires, uneven blocks, one aligned column) next to the
 *          lowercase wordmark.
 * Owner: Full Stack team
 *
 * Drawn after Brand Manual v1.0, "The logo" / "On dark backgrounds". If the
 * official wiresploit-logo-on-dark.svg is added to the project, it can
 * replace this component without changing any caller.
 */
import { LANES } from '../theme/lanes.js'

const WIRE_COLOR = '#4a4f56'
const BLOCK_HEIGHT = 6
const BLOCK_RADIUS = 1.6

// One row per wire, top to bottom: Network, UART, SPI, I2C. Each block is
// [x, width] in a 48 x 32 box. The column at x = 27 is where every lane lines
// up: the Communication Block.
const MARK_ROWS = [
  { y: 4, color: LANES.network.color, blocks: [[9, 8], [27, 8]] },
  { y: 12, color: LANES.uart.color, blocks: [[13, 6], [27, 8], [38, 7]] },
  { y: 20, color: LANES.spi.color, blocks: [[2, 5], [27, 8]] },
  { y: 28, color: LANES.i2c.color, blocks: [[17, 7], [27, 8], [38, 7]] },
]

/**
 * @param {object} props
 * @param {boolean} [props.hasWordmark=true] Show "wiresploit" beside the mark.
 * @param {number} [props.markHeightPx=22] Rendered height of the mark.
 */
export default function BrandMark({ hasWordmark = true, markHeightPx = 22 }) {
  return (
    <span className="brand-mark">
      <svg
        viewBox="0 0 48 32"
        height={markHeightPx}
        width={(markHeightPx * 48) / 32}
        role="img"
        aria-label="Wiresploit"
      >
        {MARK_ROWS.map((row) => (
          <g key={row.y}>
            <line x1="0" y1={row.y} x2="48" y2={row.y} stroke={WIRE_COLOR} strokeWidth="1.4" />
            {row.blocks.map(([x, width]) => (
              <rect
                key={x}
                x={x}
                y={row.y - BLOCK_HEIGHT / 2}
                width={width}
                height={BLOCK_HEIGHT}
                rx={BLOCK_RADIUS}
                fill={row.color}
              />
            ))}
          </g>
        ))}
      </svg>
      {hasWordmark && <span className="brand-wordmark">wiresploit</span>}
    </span>
  )
}
