/**
 * Module: ResultCard
 * Purpose: Panel showing the result of an executed network action.
 * Owner: Injection team
 */
import { formatDurationMs, formatTarget } from "../lib/format";
import type { ExecutionResult } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

interface ResultCardProps {
  result: ExecutionResult | null;
}

export default function ResultCard({ result }: ResultCardProps) {
  if (!result) {
    return (
      <div className="panel">
        <h2>Execution result</h2>
        <StatusBadge status="ready" label="Ready" />
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Execution result</h2>
      <StatusBadge status={result.status} />
      <dl className="kv-grid">
        <dt>Action ID</dt>
        <dd>{result.action_id}</dd>
        {result.node_id && (
          <>
            <dt>Injection Node</dt>
            <dd>{result.node_id}</dd>
          </>
        )}
        <dt>Protocol</dt>
        <dd>{result.protocol}</dd>
        <dt>Target</dt>
        <dd>{formatTarget(result.target)}</dd>
        {result.duration_ms != null && (
          <>
            <dt>Duration</dt>
            <dd>{formatDurationMs(result.duration_ms)}</dd>
          </>
        )}
      </dl>
      <p className="hint">{result.message}</p>
      {result.error && <p className="error-text">{result.error}</p>}
      {result.packet_summary && <div className="code-block">{result.packet_summary}</div>}
    </div>
  );
}
