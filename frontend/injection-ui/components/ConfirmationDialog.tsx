import type { NetworkAction, NodeConfig } from "../types/networkAction";

interface Props {
  action: NetworkAction;
  node: NodeConfig | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}

export default function ConfirmationDialog({ action, node, onCancel, onConfirm, busy }: Props) {
  const targetLabel = action.target.port
    ? `${action.target.address}:${action.target.port}`
    : action.target.address;

  return (
    <div className="panel">
      <h2>Confirm Network Test</h2>
      <div className="warning-banner">This will send real traffic to the target below.</div>
      <dl className="summary-grid">
        <dt>Injection Node</dt>
        <dd>{node ? `${node.node_id} (${node.address}:${node.port})` : "PC (local)"}</dd>
        <dt>Protocol</dt>
        <dd>{action.protocol}</dd>
        <dt>Test</dt>
        <dd>{action.test_type}</dd>
        <dt>Interface</dt>
        <dd>{action.interface}</dd>
        <dt>Target</dt>
        <dd>{targetLabel}</dd>
        {action.payload && (
          <>
            <dt>Payload</dt>
            <dd>
              {action.payload.value} ({action.payload.format})
            </dd>
          </>
        )}
        <dt>Timeout</dt>
        <dd>{action.timeout}s</dd>
      </dl>
      <div className="button-row">
        <button className="btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn primary" onClick={onConfirm} disabled={busy}>
          {busy ? "Executing…" : "Confirm & Execute"}
        </button>
      </div>
    </div>
  );
}
