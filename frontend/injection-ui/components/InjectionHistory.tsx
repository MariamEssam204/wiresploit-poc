import { useState } from "react";
import type { ExecutionResult } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

interface Props {
  history: ExecutionResult[];
}

export default function InjectionHistory({ history }: Props) {
  const [selected, setSelected] = useState<ExecutionResult | null>(null);

  if (history.length === 0) {
    return (
      <div className="panel">
        <h2>Injection History</h2>
        <p className="empty-state">No actions recorded yet. Validate and execute a test to see it here.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Injection History</h2>
      <table className="history">
        <thead>
          <tr>
            <th>ID</th>
            <th>Proto</th>
            <th>Target</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.action_id + h.started_at} onClick={() => setSelected(h)}>
              <td>{h.action_id}</td>
              <td>{h.protocol}</td>
              <td>
                {h.target.port ? `${h.target.address}:${h.target.port}` : h.target.address}
              </td>
              <td>
                <StatusBadge status={h.status} />
              </td>
              <td>{new Date(h.started_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="action-detail">
          {JSON.stringify(selected, null, 2)}
        </div>
      )}
    </div>
  );
}
