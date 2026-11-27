/**
 * Module: UartConfirmationDialog
 * Purpose: Final confirmation before a UART action transmits on the line.
 * Owner: Injection team
 */
import { formatNode } from "../lib/format";
import type { NodeConfig } from "../types/networkAction";
import type { UARTAction } from "../types/uartAction";

interface UartConfirmationDialogProps {
  action: UARTAction;
  node: NodeConfig | null;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
}

export default function UartConfirmationDialog({
  action,
  node,
  onCancel,
  onConfirm,
  isBusy,
}: UartConfirmationDialogProps) {
  return (
    <div className="panel">
      <h2>Confirm UART injection</h2>
      <div className="banner-warn">This transmits the configured payload on the real UART line.</div>
      <dl className="kv-grid">
        <dt>Injection Node</dt>
        <dd>{node ? formatNode(node) : "—"}</dd>
        <dt>Interface</dt>
        <dd>{action.interface}</dd>
        <dt>Baud rate</dt>
        <dd>{action.configuration.baud_rate}</dd>
        <dt>Payload</dt>
        <dd>
          {action.payload.value} ({action.payload.format})
        </dd>
        <dt>Response check</dt>
        <dd>{action.compare_response ? "Exact match required" : "Capture only"}</dd>
        <dt>Timeout</dt>
        <dd>{action.timeout} s</dd>
      </dl>
      <div className="button-row">
        <button className="btn" onClick={onCancel} disabled={isBusy}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={isBusy}>
          {isBusy ? "Executing…" : "Confirm and execute"}
        </button>
      </div>
    </div>
  );
}
