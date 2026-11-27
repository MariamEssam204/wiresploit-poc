/**
 * Module: UartActionBuilder
 * Purpose: Build, validate, confirm and execute a UART injection action on
 *          the configured Injection Node.
 * Owner: Injection team
 */
import { useEffect, useState } from "react";
import { formatNode, getErrorMessage } from "../lib/format";
import {
  readUartInterfaces,
  sendUartExecutionRequest,
  sendUartValidationRequest,
} from "../services/uartApi";
import { ACTION_STAGE, type ActionStage } from "../types/actionStage";
import type { NodeConfig } from "../types/networkAction";
import type {
  UartInterface,
  UARTAction,
  UARTConfiguration,
  UARTExecutionResult,
  UARTValidationResult,
} from "../types/uartAction";
import CaptureLockNote from "./CaptureLockNote";
import PayloadEditor from "./PayloadEditor";
import UartConfigFields from "./UartConfigFields";
import UartConfirmationDialog from "./UartConfirmationDialog";
import UartResultCard from "./UartResultCard";
import ValidationResultPanel from "./ValidationResult";

const DEFAULT_BAUD_RATE = 115200;
const TIMEOUT_MIN_S = 0.1;
const TIMEOUT_MAX_S = 30;
const TIMEOUT_STEP_S = 0.1;

const DEFAULT_ACTION: UARTAction = {
  domain: "uart_injection",
  interface: "",
  configuration: {
    baud_rate: DEFAULT_BAUD_RATE,
    data_bits: 8,
    parity: "none",
    stop_bits: 1,
    flow_control: "none",
  },
  payload: { format: "hex", value: "55 AA 01 02 03" },
  timeout: 2,
  compare_response: false,
};

interface UartActionBuilderProps {
  onExecuted: () => void;
  node: NodeConfig | null;
  isCapturing?: boolean;
}

export default function UartActionBuilder({ onExecuted, node, isCapturing }: UartActionBuilderProps) {
  const [interfaces, setInterfaces] = useState<UartInterface[]>([]);
  const [action, setAction] = useState<UARTAction>(DEFAULT_ACTION);
  const [stage, setStage] = useState<ActionStage>(ACTION_STAGE.DRAFT);
  const [validation, setValidation] = useState<UARTValidationResult | null>(null);
  const [result, setResult] = useState<UARTExecutionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Injection is only allowed while capturing, so injected traffic is recorded.
  // Undefined means the page runs standalone, without capture control.
  const isInjectionLocked = isCapturing === false;

  // UART interfaces live on the Injection Node, so there is nothing to list
  // until a node is configured.
  useEffect(() => {
    if (!node) {
      setInterfaces([]);
      return;
    }
    readUartInterfaces()
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

  function updateAction(patch: Partial<UARTAction>) {
    setAction((current) => ({ ...current, ...patch }));
    setStage(ACTION_STAGE.DRAFT);
    setValidation(null);
  }

  function updateConfiguration(patch: Partial<UARTConfiguration>) {
    updateAction({ configuration: { ...action.configuration, ...patch } });
  }

  async function handleValidate() {
    setStage(ACTION_STAGE.VALIDATING);
    setApiError(null);
    try {
      const validationResult = await sendUartValidationRequest(action);
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
      setResult(await sendUartExecutionRequest(action));
      setStage(ACTION_STAGE.DONE);
      onExecuted();
    } catch (error) {
      setApiError(getErrorMessage(error));
      setStage(ACTION_STAGE.VALID);
    }
  }

  const isConfirming = stage === ACTION_STAGE.VALID || stage === ACTION_STAGE.EXECUTING;
  const noInterfaceLabel = node ? "No UART interfaces discovered" : "No node configured";

  return (
    <div>
      <div className="panel">
        <h2>UART test action</h2>
        <p className="hint injection-intro">
          {node
            ? `Real transmissions run on Injection Node ${formatNode(node)}.`
            : "UART injection needs a configured Injection Node. Configure one in the panel above."}
        </p>

        <div className="field">
          <label htmlFor="uart-interface">Interface</label>
          <select
            id="uart-interface"
            value={action.interface}
            onChange={(event) => updateAction({ interface: event.target.value })}
            disabled={!node}
          >
            {interfaces.length === 0 && <option value="">{noInterfaceLabel}</option>}
            {interfaces.map((uartInterface) => (
              <option key={uartInterface.name} value={uartInterface.name}>
                {uartInterface.name} ({uartInterface.type})
              </option>
            ))}
          </select>
        </div>

        <UartConfigFields configuration={action.configuration} onChange={updateConfiguration} />

        <PayloadEditor
          idPrefix="uart-payload"
          payload={action.payload}
          isRequired
          onChange={(payload) => updateAction({ payload })}
        />

        <div className="field">
          <label htmlFor="uart-timeout">Timeout (seconds)</label>
          <input
            id="uart-timeout"
            type="number"
            min={TIMEOUT_MIN_S}
            max={TIMEOUT_MAX_S}
            step={TIMEOUT_STEP_S}
            value={action.timeout}
            onChange={(event) => updateAction({ timeout: Number(event.target.value) })}
          />
        </div>

        <div className="field">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={action.compare_response}
              onChange={(event) => updateAction({ compare_response: event.target.checked })}
            />
            Require exact match (wiring loopback test: TX wired straight to RX)
          </label>
          <div className="hint">
            {action.compare_response
              ? "Fails unless the received bytes exactly equal what was sent."
              : "Default: captures and reports whatever the DUT sends back, without requiring a match. Use this when talking to a real device such as an ESP32."}
          </div>
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
        <UartConfirmationDialog
          action={action}
          node={node}
          isBusy={stage === ACTION_STAGE.EXECUTING}
          onCancel={() => setStage(ACTION_STAGE.DRAFT)}
          onConfirm={handleConfirmExecute}
        />
      )}

      <UartResultCard result={result} />
    </div>
  );
}
