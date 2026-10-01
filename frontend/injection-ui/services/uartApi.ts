import type { UartInterface, UARTAction, UARTExecutionResult, UARTValidationResult } from "../types/uartAction";

const BASE_URL = "/api/injection";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchUartInterfaces(): Promise<UartInterface[]> {
  const data = await handle<{ interfaces: UartInterface[] }>(await fetch(`${BASE_URL}/uart/interfaces`));
  return data.interfaces;
}

export async function validateUartAction(action: UARTAction): Promise<UARTValidationResult> {
  return handle(
    await fetch(`${BASE_URL}/uart/actions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    })
  );
}

export async function executeUartAction(action: UARTAction): Promise<UARTExecutionResult> {
  return handle(
    await fetch(`${BASE_URL}/uart/actions/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    })
  );
}

export async function fetchUartHistory(): Promise<UARTExecutionResult[]> {
  return handle(await fetch(`${BASE_URL}/uart/actions`));
}
