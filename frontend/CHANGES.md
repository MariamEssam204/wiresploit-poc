# Frontend UI refresh: brand theme, coding rules, modular structure

## 1. Brand colours (dark mode)

All colours come from the Wiresploit Brand Manual v1.0, on-dark values.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#121416` Ink | Page background |
| `--text` / `--text-dim` / `--text-faint` | Grey 100 / 300 / 400 | Text |
| `--border` / `--wire` | `#3A3F45` Grey 700 | Lines |
| `--signal` | `#F2614C` | Primary action (Start capture, Confirm and execute), critical findings, injected events |
| Lanes | Network `#3987E5`, UART `#C98500`, SPI `#199E70`, I2C `#9085E9`, Wireless `#D55181`, Snapshot `#A9AFB6` | Bus marks only |

- **Fonts:** Inter Tight for headlines, Inter for UI text, JetBrains Mono for data. They are bundled with `@fontsource`, so they also work offline on the lab network.
- **Lane colours** are defined once, in `src/theme/lanes.js`. At startup they are copied into CSS variables, so CSS and JS always agree.
- **Brand rules applied:**
  - Text is never written in lane colours. Lane tags are a coloured block plus a grey label.
  - Signal red is used about once per view.
  - Activity boxes in Context analysis stay neutral, because they are clusters, not buses.
- **One deliberate change:** sequence-diagram arrows are now coloured by bus (all network protocols are blue). The protocol name is still printed on every arrow. To colour by protocol instead, edit `getMarkColorForName()` in `lanes.js`.

## 2. Modular structure: how to add things

| To add… | Do this |
|---|---|
| A main tab | Create `src/views/<name>/<Name>View.jsx`, then add one entry to `VIEWS` in `src/app/viewRegistry.js` |
| An analysis engine | Create `src/views/analysis/<name>/<Name>Engine.jsx`, then add one entry to `ENGINES` in `engineRegistry.js` |
| An injection domain (for example SPI) | Create `injection-ui/pages/<Name>Injection.tsx`, then add one entry to `INJECTION_DOMAINS` in `src/views/injection/injectionDomains.js` |
| A colour or size | Change `src/theme/tokens.css` (lanes go in `lanes.js`) |

- Views take no props. They read capture state and navigation with `useAppContext()` (for example `navigation.showPacket(id)`).
- Shared building blocks are already styled in `src/theme/components.css`, so new screens usually need no new CSS:
  - `.panel`, `.btn` and `.btn-primary`, `.chip`, `.field`, `.status-badge`, `.data-table`, `.stat-tile`, `.view-header`
  - The `TabBar` and `LaneTag` components

```
src/
  app/            AppContext.jsx, viewRegistry.js
  theme/          tokens.css, lanes.js, base.css, components.css, index.js
  components/     BrandMark, Navbar, TabBar, LaneTag
  hooks/          useCapture, useMeasuredWidth
  api/ lib/       client.js, format.js
  views/
    timeline/     LiveTimeline, FilterBar, PacketTable, PacketDetails, PayloadView
    analysis/     AnalysisView, engineRegistry, findings/, context/
    injection/    InjectionView, injectionDomains
injection-ui/
  services/http.ts (shared), hooks/useActionHistory.ts, lib/format.ts,
  types/actionStage.ts, components/HistoryPanel.tsx (generic), Uart* split into 4 files
```

## 3. Coding rules applied

Agreed for the frontend: camelCase in JS and TS (the TypeScript exception in the rules) and PascalCase component files. Everything else follows the rules file:

- **Verb-first function names**, with I/O verbs (`read`, `send`, `write`) for network calls.
- **Booleans** start with `is`, `has` or `should`.
- **Constants** are in `UPPER_SNAKE_CASE`, with units in names (`SEARCH_DEBOUNCE_MS`, `rowHeightPx`, `timeoutS`).
- **No magic values.**
- **Module, Purpose and Owner header** in every file. Owners are set to "Full Stack team" or "Injection team"; adjust them as needed.
- **Comments** sit above the code they explain, with no trailing inline comments.
- **No silent failures:**
  - Failed capture start/stop and history loads now show an error.
  - Malformed stream frames are reported.

### Renamed functions (old → new)

| Old | New |
|---|---|
| `apiStart` / `apiStop` (client) | `sendCaptureStart` / `sendCaptureStop` |
| `getRecentPackets` | `readRecentPackets` |
| `getFindings` | `readFindings` |
| `getContextAnalysis` | `readContextAnalysis` |
| `searchPackets` | `readMatchingPackets` |
| `openStream` | `startPacketStream` |
| `fmtDuration` | `formatSessionClock` |
| `fmtTime` | `formatClockTime` / `formatDateTime` |
| `tsValue` | `getTimestampMs` |
| `psfPreview` | `buildPsfPreview` |
| `toHex` / `hexToBytes` | `formatHex` / `parseHexBytes` |
| `clear` (useCapture) | `clearPackets` |
| `setSelectedId` | `selectPacket` |
| `gotoPacket` | `navigation.showPacket` |
| `capturing`, `connected`, `loading`, `autoScroll`, `panelOpen` | `isCapturing`, `isConnected`, `isLoading`, `shouldAutoScroll`, `isPanelOpen` |
| `fetchInterfaces`, `fetchHistory`, `fetchNodeConfig`, `fetchNodeInterfaces` | `readInterfaces`, `readHistory`, `readNodeConfig`, `readNodeInterfaces` |
| `validateAction` / `executeAction` | `sendValidationRequest` / `sendExecutionRequest` |
| `saveNodeConfig` / `clearNodeConfig` / `checkNodeHealth` | `writeNodeConfig` / `deleteNodeConfig` / `readNodeHealth` |
| `fetchUartInterfaces`, `validateUartAction`, `executeUartAction`, `fetchUartHistory` | `readUartInterfaces`, `sendUartValidationRequest`, `sendUartExecutionRequest`, `readUartHistory` |
| prop `capturing` (injection pages) | `isCapturing` |

Backend JSON field names (`event_type`, `payload_hex`, `test_type`, …) are unchanged. They are the wire format.

## 4. Injection tab

- The Injection tab is now one page with three parts:
  - Start capture and Stop capture buttons, which drive the same capture as the navbar.
  - The live packet table, reusing the timeline's `PacketTable`.
  - The packet details, reusing `PacketDetails`.
- The Network and UART forms in `injection-ui/` are kept but hidden. To show them again, render the entries in `src/views/injection/injectionDomains.js`.

## 5. Checks run

- `vite build` passes.
- Strict `tsc` passes on all `injection-ui` files.
- Every tab was clicked through in a browser against a mocked API, with no console errors.
