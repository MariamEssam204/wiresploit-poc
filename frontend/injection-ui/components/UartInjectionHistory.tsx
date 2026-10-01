import { useState } from "react";
import type { UARTExecutionResult } from "../types/uartAction";
import StatusBadge from "./StatusBadge";

interface Props {
  history: UARTExecutionResult[];
}

export default function UartInjectionHistory({ history }: Props) {
  const [selected, setSelected] = useState<UARTExecutionResult | null>(null);

  if (history.length === 0) {
    return (
      <div className="panel">
        <h2>UART Injection History</h2>
        <p className="empty-state">No UART actions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>UART Injection History</h2>
      <table className="history">
        <thead>
          <tr>
            <th>ID</th>
            <th>Interface</th>
            <th>Baud</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.action_id + h.started_at} onClick={() => setSelected(h)}>
              <td>{h.action_id}</td>
              <td>{h.interface}</td>
              <td>{h.configuration.baud_rate}</td>
              <td>
                <StatusBadge status={h.status} />
              </td>
              <td>{new Date(h.started_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && <div className="action-detail">{JSON.stringify(selected, null, 2)}</div>}
    </div>
  );
}
