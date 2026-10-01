import { useEffect, useState } from "react";
import { executeUartAction, fetchUartInterfaces, validateUartAction } from "../services/uartApi";
import { BAUD_RATES } from "../types/uartAction";
import type {
  DataBits,
  FlowControl,
  Parity,
  StopBits,
  UartInterface,
  UARTAction,
  UARTExecutionResult,
  UARTValidationResult,
} from "../types/uartAction";
import type { NodeConfig } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

type Stage = "draft" | "validating" | "valid" | "invalid" | "executing" | "done";

const DEFAULT_ACTION: UARTAction = {
  domain: "uart_injection",
  interface: "",
  configuration: { baud_rate: 115200, data_bits: 8, parity: "none", stop_bits: 1, flow_control: "none" },
  payload: { format: "hex", value: "55 AA 01 02 03" },
  timeout: 2,
  compare_response: false,
};

export default function UartActionBuilder({ onExecuted, node, capturing }: { onExecuted: () => void; node: NodeConfig | null; capturing?: boolean }) {
  const [interfaces, setInterfaces] = useState<UartInterface[]>([]);
  const [action, setAction] = useState<UARTAction>(DEFAULT_ACTION);
  const [stage, setStage] = useState<Stage>("draft");
  const [validation, setValidation] = useState<UARTValidationResult | null>(null);
  const [result, setResult] = useState<UARTExecutionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!node) {
      setInterfaces([]);
      return;
    }
    fetchUartInterfaces()
      .then((ifaces) => {
        setInterfaces(ifaces);
        setAction((a) => ({ ...a, interface: ifaces.some((i) => i.name === a.interface) ? a.interface : ifaces[0]?.name ?? "" }));
      })
      .catch((e) => setApiError(String(e)));
  }, [node]);

  function updateAction(patch: Partial<UARTAction>) {
    setAction((a) => ({ ...a, ...patch }));
    setStage("draft");
    setValidation(null);
  }

  function updateConfig(patch: Partial<UARTAction["configuration"]>) {
    updateAction({ configuration: { ...action.configuration, ...patch } });
  }

  async function handleValidate() {
    setStage("validating");
    setApiError(null);
    try {
      const v = await validateUartAction(action);
      setValidation(v);
      setStage(v.valid ? "valid" : "invalid");
    } catch (e) {
      setApiError(String(e));
      setStage("draft");
    }
  }

  async function handleConfirmExecute() {
    if (capturing === false) return; // injection disabled unless capturing
    setStage("executing");
    setApiError(null);
    try {
      const r = await executeUartAction(action);
      setResult(r);
      setStage("done");
      onExecuted();
    } catch (e) {
      setApiError(String(e));
      setStage("valid");
    }
  }

  return (
    <div>
      <div className="panel">
        <h2>UART Test Action</h2>
        <p className="hint" style={{ marginTop: "-0.5rem", marginBottom: "0.9rem" }}>
          {node
            ? `Real transmissions run on Injection Node "${node.node_id}" (${node.address}:${node.port}).`
            : "UART injection requires a configured Injection Node — configure one in the panel above."}
        </p>

        <div className="field">
          <label htmlFor="uart-interface">Interface</label>
          <select
            id="uart-interface"
            value={action.interface}
            onChange={(e) => updateAction({ interface: e.target.value })}
            disabled={!node}
          >
            {interfaces.length === 0 && <option value="">{node ? "No UART interfaces discovered" : "No node configured"}</option>}
            {interfaces.map((i) => (
              <option key={i.name} value={i.name}>
                {i.name} ({i.type})
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="baud-rate">Baud Rate</label>
            <select
              id="baud-rate"
              value={action.configuration.baud_rate}
              onChange={(e) => updateConfig({ baud_rate: Number(e.target.value) })}
            >
              {BAUD_RATES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="data-bits">Data Bits</label>
            <select
              id="data-bits"
              value={action.configuration.data_bits}
              onChange={(e) => updateConfig({ data_bits: Number(e.target.value) as DataBits })}
            >
              {[5, 6, 7, 8].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="parity">Parity</label>
            <select
              id="parity"
              value={action.configuration.parity}
              onChange={(e) => updateConfig({ parity: e.target.value as Parity })}
            >
              {["none", "even", "odd", "mark", "space"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="stop-bits">Stop Bits</label>
            <select
              id="stop-bits"
              value={action.configuration.stop_bits}
              onChange={(e) => updateConfig({ stop_bits: Number(e.target.value) as StopBits })}
            >
              {[1, 1.5, 2].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="flow-control">Flow Control</label>
          <select
            id="flow-control"
            value={action.configuration.flow_control}
            onChange={(e) => updateConfig({ flow_control: e.target.value as FlowControl })}
          >
            <option value="none">None</option>
            <option value="rts_cts">RTS/CTS</option>
            <option value="xon_xoff">XON/XOFF</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="uart-payload">Payload</label>
          <textarea
            id="uart-payload"
            value={action.payload.value}
            onChange={(e) => updateAction({ payload: { ...action.payload, value: e.target.value } })}
          />
          <div className="hint">
            {action.payload.format === "hex" ? "Space-separated hex bytes, e.g. 55 AA 01 02 03" : "Plain UTF-8 text"}
          </div>
        </div>
        <div className="field">
          <label htmlFor="uart-payload-format">Payload Format</label>
          <select
            id="uart-payload-format"
            value={action.payload.format}
            onChange={(e) => updateAction({ payload: { ...action.payload, format: e.target.value as "text" | "hex" } })}
          >
            <option value="text">Text</option>
            <option value="hex">Hex</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="uart-timeout">Timeout (seconds)</label>
          <input
            id="uart-timeout"
            type="number"
            min={0.1}
            max={30}
            step={0.1}
            value={action.timeout}
            onChange={(e) => updateAction({ timeout: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={action.compare_response}
              onChange={(e) => updateAction({ compare_response: e.target.checked })}
              style={{ marginRight: "0.4rem" }}
            />
            Require exact match (wiring loopback test — TX wired straight to RX)
          </label>
          <div className="hint">
            {action.compare_response
              ? "Fails unless the received bytes exactly equal what was sent."
              : "Default: captures and reports whatever the DUT sends back, without requiring a match — use this when talking to a real device like an ESP32."}
          </div>
        </div>

        <div className="button-row">
          <button
            className="btn primary"
            onClick={handleValidate}
            disabled={stage === "validating" || capturing === false}
          >
            {stage === "validating" ? "Validating…" : "Validate Action"}
          </button>
        </div>
        {capturing === false && (
          <p className="hint" style={{ marginTop: "0.6rem" }}>
            Press <strong>Start Capture</strong> to enable injection — injection events are
            only recorded while capturing.
          </p>
        )}

        {apiError && <p style={{ color: "var(--err)", fontSize: "0.82rem", marginTop: "0.6rem" }}>{apiError}</p>}
      </div>

      <div className="panel">
        <h2>Validation</h2>
        {!validation ? (
          <StatusBadge status="ready" label="READY" />
        ) : (
          <>
            <StatusBadge status={validation.valid ? "valid" : "invalid"} label={validation.valid ? "VALID" : "INVALID"} />
            <p className="hint" style={{ marginTop: "0.6rem" }}>{validation.message}</p>
            {validation.errors.length > 0 && (
              <ul className="error-list">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {(stage === "valid" || stage === "executing") && (
        <div className="panel">
          <h2>Confirm UART Injection</h2>
          <div className="warning-banner">This will transmit the configured payload on the real UART line.</div>
          <dl className="summary-grid">
            <dt>Injection Node</dt>
            <dd>{node ? `${node.node_id} (${node.address}:${node.port})` : "—"}</dd>
            <dt>Interface</dt>
            <dd>{action.interface}</dd>
            <dt>Baud Rate</dt>
            <dd>{action.configuration.baud_rate}</dd>
            <dt>Payload</dt>
            <dd>
              {action.payload.value} ({action.payload.format})
            </dd>
            <dt>Response Check</dt>
            <dd>{action.compare_response ? "Exact match required" : "Capture only"}</dd>
            <dt>Timeout</dt>
            <dd>{action.timeout}s</dd>
          </dl>
          <div className="button-row">
            <button className="btn" onClick={() => setStage("draft")} disabled={stage === "executing"}>
              Cancel
            </button>
            <button className="btn primary" onClick={handleConfirmExecute} disabled={stage === "executing"}>
              {stage === "executing" ? "Executing…" : "Confirm & Execute"}
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        <h2>Execution Result</h2>
        {!result ? (
          <StatusBadge status="ready" label="READY" />
        ) : (
          <>
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
              <dt>Interface</dt>
              <dd>{result.interface}</dd>
              {result.duration_ms != null && (
                <>
                  <dt>Duration</dt>
                  <dd>{result.duration_ms.toFixed(2)} ms</dd>
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
            {result.error && <p style={{ color: "var(--err)", fontSize: "0.82rem" }}>{result.error}</p>}
            {result.packet_summary && <div className="action-detail">{result.packet_summary}</div>}
          </>
        )}
      </div>
    </div>
  );
}
