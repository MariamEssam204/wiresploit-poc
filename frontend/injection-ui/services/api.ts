import type {
  ExecutionResult,
  NetworkAction,
  NetworkInterface,
  NodeConfig,
  NodeStatus,
  ValidationResult,
} from "../types/networkAction";

const BASE_URL = "/api/injection";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<{ status: string }> {
  return handle(await fetch(`${BASE_URL}/health`));
}

export async function fetchInterfaces(): Promise<NetworkInterface[]> {
  const data = await handle<{ interfaces: NetworkInterface[] }>(
    await fetch(`${BASE_URL}/interfaces`)
  );
  return data.interfaces;
}

export async function validateAction(action: NetworkAction): Promise<ValidationResult> {
  return handle(
    await fetch(`${BASE_URL}/actions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    })
  );
}

export async function executeAction(action: NetworkAction): Promise<ExecutionResult> {
  return handle(
    await fetch(`${BASE_URL}/actions/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    })
  );
}

export async function fetchHistory(): Promise<ExecutionResult[]> {
  return handle(await fetch(`${BASE_URL}/actions`));
}

export async function fetchActionDetails(actionId: string): Promise<ExecutionResult> {
  return handle(await fetch(`${BASE_URL}/actions/${actionId}`));
}

export async function fetchNodeConfig(): Promise<NodeConfig | null> {
  const res = await fetch(`${BASE_URL}/node/config`);
  if (res.status === 200) {
    const text = await res.text();
    if (!text || text === "null") return null;
    return JSON.parse(text);
  }
  return null;
}

export async function saveNodeConfig(config: NodeConfig): Promise<NodeConfig> {
  return handle(
    await fetch(`${BASE_URL}/node/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
  );
}

export async function clearNodeConfig(): Promise<void> {
  await fetch(`${BASE_URL}/node/config`, { method: "DELETE" });
}

export async function checkNodeHealth(): Promise<NodeStatus> {
  return handle(await fetch(`${BASE_URL}/node/health`));
}

export async function fetchNodeInterfaces(): Promise<NetworkInterface[]> {
  const data = await handle<{ interfaces: NetworkInterface[] }>(
    await fetch(`${BASE_URL}/node/interfaces`)
  );
  return data.interfaces;
}
