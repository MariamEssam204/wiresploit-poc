/**
 * Module: format
 * Purpose: Display helpers shared by the injection components.
 * Owner: Injection team
 */
import type { NodeConfig, Target } from "../types/networkAction";

const DURATION_DECIMALS = 2;

/** Format a target as "address:port", or just the address when no port. */
export function formatTarget(target: Target): string {
  return target.port ? `${target.address}:${target.port}` : target.address;
}

/** Format an Injection Node as "name (address:port)". */
export function formatNode(node: NodeConfig): string {
  return `${node.node_id} (${node.address}:${node.port})`;
}

/** Format a duration in milliseconds, e.g. "12.34 ms". */
export function formatDurationMs(durationMs: number): string {
  return `${durationMs.toFixed(DURATION_DECIMALS)} ms`;
}

/** Format an ISO timestamp as a local clock time. */
export function formatStartTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString();
}

/** Turn an error of unknown type into a readable message. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
