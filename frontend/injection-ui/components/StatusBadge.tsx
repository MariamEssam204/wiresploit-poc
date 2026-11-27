/**
 * Module: StatusBadge
 * Purpose: Small status pill for validation and execution states, styled
 *          by outcome (ok, error, pending, running) rather than raw value.
 * Owner: Injection team
 */

const OK_STATUSES = new Set(["valid", "validated", "success", "connected"]);
const ERROR_STATUSES = new Set([
  "invalid",
  "failed",
  "error",
  "aborted",
  "validation_error",
  "interface_error",
  "timeout",
  "mismatch",
  "execution_error",
  "disconnected",
]);
const PENDING_STATUSES = new Set(["dry_run", "pending", "busy"]);
const RUNNING_STATUSES = new Set(["running"]);

function getOutcomeClass(status: string): string {
  if (OK_STATUSES.has(status)) return "is-ok";
  if (ERROR_STATUSES.has(status)) return "is-err";
  if (PENDING_STATUSES.has(status)) return "is-pending";
  if (RUNNING_STATUSES.has(status)) return "is-running";
  return "";
}

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getOutcomeClass(status)}`}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}
