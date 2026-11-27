/**
 * Module: ValidationResult
 * Purpose: Panel showing the outcome of validating an injection action.
 *          Used by both the network and UART builders.
 * Owner: Injection team
 */
import StatusBadge from "./StatusBadge";

interface ValidationOutcome {
  valid: boolean;
  errors: string[];
  message: string;
}

interface ValidationResultPanelProps {
  result: ValidationOutcome | null;
}

export default function ValidationResultPanel({ result }: ValidationResultPanelProps) {
  return (
    <div className="panel">
      <h2>Validation</h2>
      {!result ? (
        <>
          <StatusBadge status="ready" label="Ready" />
          <p className="hint">Configure an action and select Validate.</p>
        </>
      ) : (
        <>
          <StatusBadge
            status={result.valid ? "valid" : "invalid"}
            label={result.valid ? "Valid" : "Invalid"}
          />
          <p className="hint">{result.message}</p>
          {result.errors.length > 0 && (
            <ul className="error-text">
              {result.errors.map((errorMessage, index) => (
                <li key={index}>{errorMessage}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
