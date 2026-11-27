/**
 * Module: NodePanel
 * Purpose: Configure the Injection Node (name, address, port), save it to
 *          the injection backend, and check that it is reachable.
 * Owner: Injection team
 */
import { useEffect, useState } from "react";
import { getErrorMessage } from "../lib/format";
import { readNodeConfig, readNodeHealth, writeNodeConfig } from "../services/api";
import type { NodeConfig, NodeStatus } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

const DEFAULT_NODE_CONFIG: NodeConfig = { node_id: "NET-INJECTOR-01", address: "", port: 9000 };

interface NodePanelProps {
  onNodeChange: (config: NodeConfig | null) => void;
}

export default function NodePanel({ onNodeChange }: NodePanelProps) {
  const [config, setConfig] = useState<NodeConfig>(DEFAULT_NODE_CONFIG);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function checkConnection() {
    setIsChecking(true);
    try {
      setNodeStatus(await readNodeHealth());
    } catch {
      setNodeStatus({ connected: false, detail: "Could not reach the PC backend." });
    } finally {
      setIsChecking(false);
    }
  }

  // Load a previously saved node once, on mount.
  useEffect(() => {
    readNodeConfig()
      .then((savedConfig) => {
        if (!savedConfig) return;
        setConfig(savedConfig);
        setIsSaved(true);
        onNodeChange(savedConfig);
        checkConnection();
      })
      .catch((error) => setSaveError(`Could not load the node configuration (${getErrorMessage(error)})`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaveError(null);
    try {
      const savedConfig = await writeNodeConfig(config);
      setConfig(savedConfig);
      setIsSaved(true);
      onNodeChange(savedConfig);
      checkConnection();
    } catch (error) {
      // Most common cause: the injection backend (:8100) is not running.
      setSaveError(`Could not save. Is the injection backend running? (${getErrorMessage(error)})`);
    }
  }

  return (
    <div className="panel">
      <h2>Injection Node</h2>

      <div className="field">
        <label htmlFor="node-id">Node name</label>
        <input
          id="node-id"
          type="text"
          value={config.node_id}
          onChange={(event) => setConfig({ ...config, node_id: event.target.value })}
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
            onChange={(event) => setConfig({ ...config, address: event.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="node-port">Port</label>
          <input
            id="node-port"
            type="number"
            value={config.port}
            onChange={(event) => setConfig({ ...config, port: Number(event.target.value) })}
          />
        </div>
      </div>

      <div className="field">
        <label>Status</label>
        <div className="mode-note">
          {nodeStatus ? (
            <StatusBadge
              status={nodeStatus.connected ? "connected" : "disconnected"}
              label={nodeStatus.connected ? "Connected" : "Disconnected"}
            />
          ) : (
            <StatusBadge status="ready" label="Not tested" />
          )}
          {nodeStatus?.node_status && (
            <span className="hint">
              Node reports: {nodeStatus.node_status}
              {nodeStatus.scapy === false && " · scapy unavailable"}
            </span>
          )}
        </div>
        {nodeStatus?.detail && !nodeStatus.connected && <p className="error-text">{nodeStatus.detail}</p>}
      </div>

      <div className="button-row">
        <button className="btn" onClick={handleSave} disabled={!config.address}>
          {isSaved ? "Save changes" : "Configure node"}
        </button>
        <button className="btn btn-ghost" onClick={checkConnection} disabled={!isSaved || isChecking}>
          {isChecking ? "Testing…" : "Test connection"}
        </button>
      </div>

      {saveError && <p className="error-text">{saveError}</p>}

      <p className="hint">
        {isSaved
          ? "Real executions will run on this node."
          : "No node configured: network executions run locally on the PC. UART needs a configured node."}
      </p>
    </div>
  );
}
