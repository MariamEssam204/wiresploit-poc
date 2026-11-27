/**
 * Module: UartResultCard
 * Purpose: Panel showing the result of an executed UART action.
 * Owner: Injection team
 */
import { formatDurationMs } from "../lib/format";
import type { UARTExecutionResult } from "../types/uartAction";
import StatusBadge from "./StatusBadge";

interface UartResultCardProps {
  result: UARTExecutionResult | null;
}

export default function UartResultCard({ result }: UartResultCardProps) {
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
        <dt>Interface</dt>
        <dd>{result.interface}</dd>
        {result.duration_ms != null && (
          <>
            <dt>Duration</dt>
            <dd>{formatDurationMs(result.duration_ms)}</dd>
          </>
        )}
        {result.transmitted_bytes != null && (
          <>
            <dt>Transmitted</dt>
            <dd>{result.transmitted_bytes} bytes</dd>
          </>
        )}
        {result.received_bytes != null && (
          <>
            <dt>Received</dt>
            <dd>{result.received_bytes} bytes</dd>
          </>
        )}
        {result.received_hex && (
          <>
            <dt>Response</dt>
            <dd>{result.received_hex}</dd>
          </>
        )}
        {result.match != null && (
          <>
            <dt>Match</dt>
            <dd>{result.match ? "Yes" : "No"}</dd>
          </>
        )}
      </dl>
      <p className="hint">{result.message}</p>
      {result.error && <p className="error-text">{result.error}</p>}
      {result.packet_summary && <div className="code-block">{result.packet_summary}</div>}
    </div>
  );
}
