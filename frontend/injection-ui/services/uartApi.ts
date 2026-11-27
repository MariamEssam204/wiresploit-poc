/**
 * Module: uartApi
 * Purpose: UART injection requests to the injection backend.
 * Owner: Injection team
 */
import type {
  UartInterface,
  UARTAction,
  UARTExecutionResult,
  UARTValidationResult,
} from "../types/uartAction";
import { readJson, sendJson } from "./http";

/** Read the UART interfaces discovered on the Injection Node. */
export async function readUartInterfaces(): Promise<UartInterface[]> {
  const data = await readJson<{ interfaces: UartInterface[] }>("/uart/interfaces");
  return data.interfaces;
}

/** Ask the backend to validate a UART action without running it. */
export async function sendUartValidationRequest(action: UARTAction): Promise<UARTValidationResult> {
  return sendJson("/uart/actions/validate", action);
}

/** Ask the backend to transmit a UART action. */
export async function sendUartExecutionRequest(action: UARTAction): Promise<UARTExecutionResult> {
  return sendJson("/uart/actions/execute", action);
}

/** Read the history of executed UART actions. */
export async function readUartHistory(): Promise<UARTExecutionResult[]> {
  return readJson("/uart/actions");
}
