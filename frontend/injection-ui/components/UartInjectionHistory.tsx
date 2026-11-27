/**
 * Module: UartInjectionHistory
 * Purpose: History of executed UART actions.
 * Owner: Injection team
 */
import { formatStartTime } from "../lib/format";
import type { UARTExecutionResult } from "../types/uartAction";
import HistoryPanel, { type HistoryColumn } from "./HistoryPanel";
import StatusBadge from "./StatusBadge";

const UART_HISTORY_COLUMNS: HistoryColumn<UARTExecutionResult>[] = [
  { label: "ID", render: (entry) => entry.action_id },
  { label: "Interface", render: (entry) => entry.interface },
  { label: "Baud", render: (entry) => entry.configuration.baud_rate },
  { label: "Status", render: (entry) => <StatusBadge status={entry.status} /> },
  { label: "Time", render: (entry) => formatStartTime(entry.started_at) },
];

interface UartInjectionHistoryProps {
  history: UARTExecutionResult[];
}

export default function UartInjectionHistory({ history }: UartInjectionHistoryProps) {
  return (
    <HistoryPanel
      title="UART injection history"
      entries={history}
      columns={UART_HISTORY_COLUMNS}
      getEntryKey={(entry) => entry.action_id + entry.started_at}
      emptyMessage="No UART actions recorded yet."
    />
  );
}
