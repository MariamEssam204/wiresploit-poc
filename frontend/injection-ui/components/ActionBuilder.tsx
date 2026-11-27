/**
 * Module: ActionBuilder
 * Purpose: Build, validate, confirm and execute a network injection action.
 * Owner: Injection team
 */
import { useEffect, useState } from "react";
import { formatNode, getErrorMessage } from "../lib/format";
import {
  readInterfaces,
  readNodeInterfaces,
  sendExecutionRequest,
  sendValidationRequest,
} from "../services/api";
import { ACTION_STAGE, type ActionStage } from "../types/actionStage";
import type {
  ExecutionResult,
  NetworkAction,
  NetworkInterface,
  NodeConfig,
  Protocol,
  TestType,
  ValidationResult,
} from "../types/networkAction";
import CaptureLockNote from "./CaptureLockNote";
import ConfirmationDialog from "./ConfirmationDialog";
import InterfaceSelector from "./InterfaceSelector";
import PayloadEditor from "./PayloadEditor";
import ProtocolSelector from "./ProtocolSelector";
import ResultCard from "./ResultCard";
import ValidationResultPanel from "./ValidationResult";

const DEFAULT_TARGET_PORT = 5002;
// Port filled in when switching from ICMP (no port) to TCP or UDP.
const FALLBACK_TARGET_PORT = 5001;
const TIMEOUT_MIN_S = 0.1;
const TIMEOUT_MAX_S = 10;
const TIMEOUT_STEP_S = 0.1;

const DEFAULT_ACTION: NetworkAction = {
  domain: "network_injection",
  protocol: "UDP",
  test_type: "datagram",
  interface: "",
  target: { address: "127.0.0.1", port: DEFAULT_TARGET_PORT },
  payload: { format: "text", value: "HELLO" },
  timeout: 2,
};

const PAYLOAD_TEST_TYPES = new Set<TestType>(["application_data", "datagram", "echo"]);
const PORT_PROTOCOLS = new Set<Protocol>(["TCP", "UDP"]);

function isPayloadTest(testType: TestType): boolean {
  return PAYLOAD_TEST_TYPES.has(testType);
}

function isPortProtocol(protocol: Protocol): boolean {
  return PORT_PROTOCOLS.has(protocol);
}

interface ActionBuilderProps {
  onExecuted: () => void;
  node: NodeConfig | null;
  isCapturing?: boolean;
}

export default function ActionBuilder({ onExecuted, node, isCapturing }: ActionBuilderProps) {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [action, setAction] = useState<NetworkAction>(DEFAULT_ACTION);
  const [stage, setStage] = useState<ActionStage>(ACTION_STAGE.DRAFT);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Injection is only allowed while capturing, so injected traffic is recorded.
  // Undefined means the page runs standalone, without capture control.
  const isInjectionLocked = isCapturing === false;

  useEffect(() => {
    const interfacesRequest = node ? readNodeInterfaces() : readInterfaces();
    interfacesRequest
      .then((foundInterfaces) => {
        setInterfaces(foundInterfaces);
        setAction((current) => ({
          ...current,
          interface: foundInterfaces.some((candidate) => candidate.name === current.interface)
            ? current.interface
            : foundInterfaces[0]?.name ?? "",
        }));
      })
      .catch((error) => setApiError(getErrorMessage(error)));
  }, [node]);

  function updateAction(patch: Partial<NetworkAction>) {
    setAction((current) => ({ ...current, ...patch }));
    setStage(ACTION_STAGE.DRAFT);
    setValidation(null);
  }

  function handleProtocolChange(protocol: Protocol) {
    const port = isPortProtocol(protocol) ? action.target.port ?? FALLBACK_TARGET_PORT : undefined;
    updateAction({ protocol, target: { ...action.target, port } });
  }

  async function handleValidate() {
    setStage(ACTION_STAGE.VALIDATING);
    setApiError(null);
    try {
      const validationResult = await sendValidationRequest(action);
      setValidation(validationResult);
      setStage(validationResult.valid ? ACTION_STAGE.VALID : ACTION_STAGE.INVALID);
    } catch (error) {
      setApiError(getErrorMessage(error));
      setStage(ACTION_STAGE.DRAFT);
    }
  }

  async function handleConfirmExecute() {
    if (isInjectionLocked) return;
    setStage(ACTION_STAGE.EXECUTING);
    setApiError(null);
    try {
      setResult(await sendExecutionRequest(action));
      setStage(ACTION_STAGE.DONE);
      onExecuted();
    } catch (error) {
      setApiError(getErrorMessage(error));
      setStage(ACTION_STAGE.VALID);
    }
  }

  const isConfirming = stage === ACTION_STAGE.VALID || stage === ACTION_STAGE.EXECUTING;

  return (
    <div>
      <div className="panel">
        <h2>Network test action</h2>
        <p className="hint injection-intro">
          {node
            ? `Real executions run on Injection Node ${formatNode(node)}.`
            : "No Injection Node configured: real executions run locally on this PC."}
        </p>

        <InterfaceSelector
          interfaces={interfaces}
          value={action.interface}
          onChange={(interfaceName) => updateAction({ interface: interfaceName })}
        />

        <ProtocolSelector
          protocol={action.protocol}
          testType={action.test_type}
          onProtocolChange={handleProtocolChange}
          onTestTypeChange={(testType) => updateAction({ test_type: testType })}
        />

        <div className="field">
          <label htmlFor="target-address">Target address</label>
          <input
            id="target-address"
            type="text"
            value={action.target.address}
            onChange={(event) => updateAction({ target: { ...action.target, address: event.target.value } })}
          />
          <div className="hint">Loopback and private/LAN addresses only, e.g. 192.168.x.x or 10.x.x.x</div>
        </div>

        {isPortProtocol(action.protocol) && (
          <div className="field">
            <label htmlFor="target-port">Target port</label>
            <input
              id="target-port"
              type="number"
              value={action.target.port ?? ""}
              onChange={(event) =>
                updateAction({ target: { ...action.target, port: Number(event.target.value) } })
              }
            />
          </div>
        )}

        {isPayloadTest(action.test_type) && action.payload && (
          <PayloadEditor
            payload={action.payload}
            isRequired={action.test_type === "application_data"}
            onChange={(payload) => updateAction({ payload })}
          />
        )}

        <div className="field">
          <label htmlFor="timeout">Timeout (seconds)</label>
          <input
            id="timeout"
            type="number"
            min={TIMEOUT_MIN_S}
            max={TIMEOUT_MAX_S}
            step={TIMEOUT_STEP_S}
            value={action.timeout}
            onChange={(event) => updateAction({ timeout: Number(event.target.value) })}
          />
        </div>

        <div className="button-row">
          <button
            className="btn"
            onClick={handleValidate}
            disabled={stage === ACTION_STAGE.VALIDATING || isInjectionLocked}
          >
            {stage === ACTION_STAGE.VALIDATING ? "Validating…" : "Validate action"}
          </button>
        </div>
        {isInjectionLocked && <CaptureLockNote />}
        {apiError && <p className="error-text">{apiError}</p>}
      </div>

      <ValidationResultPanel result={validation} />

      {isConfirming && (
        <ConfirmationDialog
          action={action}
          node={node}
          isBusy={stage === ACTION_STAGE.EXECUTING}
          onCancel={() => setStage(ACTION_STAGE.DRAFT)}
          onConfirm={handleConfirmExecute}
        />
      )}

      <ResultCard result={result} />
    </div>
  );
}
