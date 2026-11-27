/**
 * Module: ConfirmationDialog
 * Purpose: Final confirmation before a network action sends real traffic.
 * Owner: Injection team
 */
import { formatNode, formatTarget } from "../lib/format";
import type { NetworkAction, NodeConfig } from "../types/networkAction";

interface ConfirmationDialogProps {
  action: NetworkAction;
  node: NodeConfig | null;
  onCancel: () => void;
  onConfirm: () => void;
  isBusy: boolean;
}

export default function ConfirmationDialog({
  action,
  node,
  onCancel,
  onConfirm,
  isBusy,
}: ConfirmationDialogProps) {
  return (
    <div className="panel">
      <h2>Confirm network test</h2>
      <div className="banner-warn">This sends real traffic to the target below.</div>
      <dl className="kv-grid">
        <dt>Injection Node</dt>
        <dd>{node ? formatNode(node) : "PC (local)"}</dd>
        <dt>Protocol</dt>
        <dd>{action.protocol}</dd>
        <dt>Test</dt>
        <dd>{action.test_type}</dd>
        <dt>Interface</dt>
        <dd>{action.interface}</dd>
        <dt>Target</dt>
        <dd>{formatTarget(action.target)}</dd>
        {action.payload && (
          <>
            <dt>Payload</dt>
            <dd>
              {action.payload.value} ({action.payload.format})
            </dd>
          </>
        )}
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
