/**
 * Module: http
 * Purpose: Shared HTTP helpers for the injection services: the API base
 *          URL, JSON response parsing, and JSON POST requests.
 * Owner: Injection team
 */

export const INJECTION_API_BASE_URL = "/api/injection";

/**
 * Parse a JSON response, turning an HTTP error into an Error that carries
 * the backend's `detail` message when it sends one.
 * @throws Error when the response status is not 2xx.
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

/** GET a path under the injection API and parse the JSON reply. */
export async function readJson<T>(path: string): Promise<T> {
  return parseJsonResponse<T>(await fetch(`${INJECTION_API_BASE_URL}${path}`));
}

/** POST a JSON body to a path under the injection API and parse the reply. */
export async function sendJson<T>(path: string, body: unknown): Promise<T> {
  return parseJsonResponse<T>(
    await fetch(`${INJECTION_API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}
