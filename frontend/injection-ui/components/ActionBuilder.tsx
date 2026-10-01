import { useEffect, useState } from "react";
import { executeAction, fetchInterfaces, fetchNodeInterfaces, validateAction } from "../services/api";
import type {
  ExecutionResult,
  NetworkAction,
  NetworkInterface,
  NodeConfig,
  Protocol,
  TestType,
  ValidationResult,
} from "../types/networkAction";
import ConfirmationDialog from "./ConfirmationDialog";
import InterfaceSelector from "./InterfaceSelector";
import PayloadEditor from "./PayloadEditor";
import ProtocolSelector from "./ProtocolSelector";
import ResultCard from "./ResultCard";
import ValidationResultPanel from "./ValidationResult";

type Stage = "draft" | "validating" | "valid" | "invalid" | "confirming" | "executing" | "done";

const DEFAULT_ACTION: NetworkAction = {
  domain: "network_injection",
  protocol: "UDP",
  test_type: "datagram",
  interface: "",
  target: { address: "127.0.0.1", port: 5002 },
  payload: { format: "text", value: "HELLO" },
  timeout: 2,
};

function usesPayload(testType: TestType) {
  return testType === "application_data" || testType === "datagram" || testType === "echo";
}

function usesPort(protocol: Protocol) {
  return protocol === "TCP" || protocol === "UDP";
}

export default function ActionBuilder({
  onExecuted,
  node,
  capturing,
}: {
  onExecuted: () => void;
  node: NodeConfig | null;
  capturing?: boolean;
}) {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [action, setAction] = useState<NetworkAction>(DEFAULT_ACTION);
  const [stage, setStage] = useState<Stage>("draft");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const load = node ? fetchNodeInterfaces() : fetchInterfaces();
    load
      .then((ifaces) => {
        setInterfaces(ifaces);
        setAction((a) => ({ ...a, interface: ifaces.some((i) => i.name === a.interface) ? a.interface : ifaces[0]?.name ?? "" }));
      })
      .catch((e) => setApiError(String(e)));
  }, [node]);

  function updateAction(patch: Partial<NetworkAction>) {
    setAction((a) => ({ ...a, ...patch }));
    setStage("draft");
    setValidation(null);
  }

  async function handleValidate() {
    setStage("validating");
    setApiError(null);
    try {
      const v = await validateAction(action);
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
      const r = await executeAction(action);
      setResult(r);
      setStage("done");
      onExecuted();
    } catch (e) {
      setApiError(String(e));
      setStage("valid");
    }
  }

  const payloadRequired = action.test_type === "application_data";

  return (
    <div>
      <div className="panel">
        <h2>Network Test Action</h2>
        <p className="hint" style={{ marginTop: "-0.5rem", marginBottom: "0.9rem" }}>
          {node
            ? `Real executions run on Injection Node "${node.node_id}" (${node.address}:${node.port}).`
            : "No Injection Node configured — real executions run locally on this PC."}
        </p>

        <InterfaceSelector
          interfaces={interfaces}
          value={action.interface}
          onChange={(interfaceName) => updateAction({ interface: interfaceName })}
        />

        <ProtocolSelector
          protocol={action.protocol}
          testType={action.test_type}
          onProtocolChange={(protocol) =>
            updateAction({
              protocol,
              target: { ...action.target, port: usesPort(protocol) ? action.target.port ?? 5001 : undefined },
            })
          }
          onTestTypeChange={(test_type) => updateAction({ test_type })}
        />

        <div className="field">
          <label htmlFor="target-address">Target Address</label>
          <input
            id="target-address"
            type="text"
            value={action.target.address}
            onChange={(e) => updateAction({ target: { ...action.target, address: e.target.value } })}
          />
          <div className="hint">Loopback and private/LAN addresses only (e.g. 192.168.x.x, 10.x.x.x) — e.g. your ESP32's IP</div>
        </div>

        {usesPort(action.protocol) && (
          <div className="field">
            <label htmlFor="target-port">Target Port</label>
            <input
              id="target-port"
              type="number"
              value={action.target.port ?? ""}
              onChange={(e) =>
                updateAction({ target: { ...action.target, port: Number(e.target.value) } })
              }
            />
          </div>
        )}

        {usesPayload(action.test_type) && action.payload && (
          <PayloadEditor
            payload={action.payload}
            required={payloadRequired}
            onChange={(payload) => updateAction({ payload })}
          />
        )}

        <div className="field">
          <label htmlFor="timeout">Timeout (seconds)</label>
          <input
            id="timeout"
            type="number"
            min={0.1}
            max={10}
            step={0.1}
            value={action.timeout}
            onChange={(e) => updateAction({ timeout: Number(e.target.value) })}
          />
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

      <ValidationResultPanel result={validation} />

      {stage === "valid" && (
        <ConfirmationDialog
          action={action}
          node={node}
          busy={false}
          onCancel={() => setStage("draft")}
          onConfirm={handleConfirmExecute}
        />
      )}

      {stage === "executing" && (
        <ConfirmationDialog action={action} node={node} busy onCancel={() => {}} onConfirm={() => {}} />
      )}

      <ResultCard result={result} />
    </div>
  );
}
