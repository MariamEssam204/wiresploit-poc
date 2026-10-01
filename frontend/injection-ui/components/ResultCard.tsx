import type { ExecutionResult } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

interface Props {
  result: ExecutionResult | null;
}

export default function ResultCard({ result }: Props) {
  if (!result) {
    return (
      <div className="panel">
        <h2>Execution Result</h2>
        <StatusBadge status="ready" label="READY" />
      </div>
    );
  }

  const targetLabel = result.target.port
    ? `${result.target.address}:${result.target.port}`
    : result.target.address;

  return (
    <div className="panel">
      <h2>Execution Result</h2>
      <StatusBadge status={result.status} />
      <dl className="summary-grid">
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
        <dd>{targetLabel}</dd>
        {result.duration_ms != null && (
          <>
            <dt>Duration</dt>
            <dd>{result.duration_ms.toFixed(2)} ms</dd>
          </>
        )}
      </dl>
      <p className="hint">{result.message}</p>
      {result.error && <p style={{ color: "var(--err)", fontSize: "0.82rem" }}>{result.error}</p>}
      {result.packet_summary && <div className="action-detail">{result.packet_summary}</div>}
    </div>
  );
}
