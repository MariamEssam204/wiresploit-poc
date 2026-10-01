import { useEffect, useState } from "react";
import { checkNodeHealth, fetchNodeConfig, saveNodeConfig } from "../services/api";
import type { NodeConfig, NodeStatus } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

interface Props {
  onNodeChange: (config: NodeConfig | null) => void;
}

export default function NodePanel({ onNodeChange }: Props) {
  const [config, setConfig] = useState<NodeConfig>({ node_id: "NET-INJECTOR-01", address: "", port: 9000 });
  const [status, setStatus] = useState<NodeStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNodeConfig().then((c) => {
      if (c) {
        setConfig(c);
        setSaved(true);
        onNodeChange(c);
        testConnection();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function testConnection() {
    setChecking(true);
    try {
      const s = await checkNodeHealth();
      setStatus(s);
    } catch {
      setStatus({ connected: false, detail: "Could not reach the PC backend." });
    } finally {
      setChecking(false);
    }
  }

  async function handleSave() {
    setError(null);
    try {
      const result = await saveNodeConfig(config);
      setConfig(result);
      setSaved(true);
      onNodeChange(result);
      testConnection();
    } catch (e) {
      // Most common cause: the injection backend (:8100) isn't running.
      setError(
        `Could not save — is the injection backend running? (${e instanceof Error ? e.message : String(e)})`
      );
    }
  }

  return (
    <div className="panel">
      <h2>Injection Node</h2>

      <div className="field">
        <label htmlFor="node-id">Node Name</label>
        <input
          id="node-id"
          type="text"
          value={config.node_id}
          onChange={(e) => setConfig({ ...config, node_id: e.target.value })}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="node-address">Address</label>
          <input
            id="node-address"
            type="text"
            placeholder="192.168.1.20"
            value={config.address}
            onChange={(e) => setConfig({ ...config, address: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="node-port">Port</label>
          <input
            id="node-port"
            type="number"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="field">
        <label>Status</label>
        {status ? (
          <StatusBadge status={status.connected ? "success" : "error"} label={status.connected ? "Connected" : "Disconnected"} />
        ) : (
          <StatusBadge status="ready" label="Not tested" />
        )}
        {status?.node_status && (
          <span className="hint" style={{ marginLeft: "0.5rem" }}>
            node reports: {status.node_status}
            {status.scapy === false && " · scapy unavailable"}
          </span>
        )}
        {status?.detail && !status.connected && <p className="hint" style={{ color: "var(--err)" }}>{status.detail}</p>}
      </div>

      <div className="button-row">
        <button className="btn primary" onClick={handleSave} disabled={!config.address}>
          {saved ? "Save Changes" : "Configure Node"}
        </button>
        <button className="btn" onClick={testConnection} disabled={!saved || checking}>
          {checking ? "Testing…" : "Test Connection"}
        </button>
      </div>

      {error && <p className="hint" style={{ color: "var(--err)" }}>{error}</p>}

      <p className="hint" style={{ marginTop: "0.7rem" }}>
        {saved
          ? "Real executions will run on this node."
          : "No node configured — network executions run locally on the PC; UART requires a configured node."}
      </p>
    </div>
  );
}
