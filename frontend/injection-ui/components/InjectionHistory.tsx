/**
 * Module: InjectionHistory
 * Purpose: History of executed network actions.
 * Owner: Injection team
 */
import { formatStartTime, formatTarget } from "../lib/format";
import type { ExecutionResult } from "../types/networkAction";
import HistoryPanel, { type HistoryColumn } from "./HistoryPanel";
import StatusBadge from "./StatusBadge";

const NETWORK_HISTORY_COLUMNS: HistoryColumn<ExecutionResult>[] = [
  { label: "ID", render: (entry) => entry.action_id },
  { label: "Protocol", render: (entry) => entry.protocol },
  { label: "Target", render: (entry) => formatTarget(entry.target) },
  { label: "Status", render: (entry) => <StatusBadge status={entry.status} /> },
  { label: "Time", render: (entry) => formatStartTime(entry.started_at) },
];

interface InjectionHistoryProps {
  history: ExecutionResult[];
}

export default function InjectionHistory({ history }: InjectionHistoryProps) {
  return (
    <HistoryPanel
      title="Network injection history"
      entries={history}
      columns={NETWORK_HISTORY_COLUMNS}
      getEntryKey={(entry) => entry.action_id + entry.started_at}
      emptyMessage="No actions recorded yet. Validate and execute a test to see it here."
    />
  );
}
