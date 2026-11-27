/**
 * Module: api
 * Purpose: Network injection and Injection Node requests to the injection
 *          backend.
 * Owner: Injection team
 */
import type {
  ExecutionResult,
  NetworkAction,
  NetworkInterface,
  NodeConfig,
  NodeStatus,
  ValidationResult,
} from "../types/networkAction";
import { INJECTION_API_BASE_URL, readJson, sendJson } from "./http";

const HTTP_OK = 200;

/** Read the injection backend's health status. */
export async function readHealth(): Promise<{ status: string }> {
  return readJson("/health");
}

/** Read the network interfaces available on the PC. */
export async function readInterfaces(): Promise<NetworkInterface[]> {
  const data = await readJson<{ interfaces: NetworkInterface[] }>("/interfaces");
  return data.interfaces;
}

/** Ask the backend to validate a network action without running it. */
export async function sendValidationRequest(action: NetworkAction): Promise<ValidationResult> {
  return sendJson("/actions/validate", action);
}

/** Ask the backend to run a network action. */
export async function sendExecutionRequest(action: NetworkAction): Promise<ExecutionResult> {
  return sendJson("/actions/execute", action);
}

/** Read the history of executed network actions. */
export async function readHistory(): Promise<ExecutionResult[]> {
  return readJson("/actions");
}

/** Read one executed network action by id. */
export async function readActionDetails(actionId: string): Promise<ExecutionResult> {
  return readJson(`/actions/${actionId}`);
}

/**
 * Read the saved Injection Node configuration.
 * @returns The configuration, or null when no node is configured.
 */
export async function readNodeConfig(): Promise<NodeConfig | null> {
  const response = await fetch(`${INJECTION_API_BASE_URL}/node/config`);
  if (response.status !== HTTP_OK) return null;
  const text = await response.text();
  if (!text || text === "null") return null;
  return JSON.parse(text);
}

/** Save the Injection Node configuration. */
export async function writeNodeConfig(config: NodeConfig): Promise<NodeConfig> {
  return sendJson("/node/config", config);
}

/** Remove the saved Injection Node configuration. */
export async function deleteNodeConfig(): Promise<void> {
  await fetch(`${INJECTION_API_BASE_URL}/node/config`, { method: "DELETE" });
}

/** Read the Injection Node's reachability and status. */
export async function readNodeHealth(): Promise<NodeStatus> {
  return readJson("/node/health");
}

/** Read the network interfaces available on the Injection Node. */
export async function readNodeInterfaces(): Promise<NetworkInterface[]> {
  const data = await readJson<{ interfaces: NetworkInterface[] }>("/node/interfaces");
  return data.interfaces;
}
