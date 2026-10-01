import type { ValidationResult as ValidationResultType } from "../types/networkAction";
import StatusBadge from "./StatusBadge";

interface Props {
  result: ValidationResultType | null;
}

export default function ValidationResultPanel({ result }: Props) {
  if (!result) {
    return (
      <div className="panel">
        <h2>Validation</h2>
        <StatusBadge status="ready" label="READY" />
        <p className="hint" style={{ marginTop: "0.6rem" }}>
          Configure an action and click Validate.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Validation</h2>
      <StatusBadge status={result.valid ? "valid" : "invalid"} label={result.valid ? "VALID" : "INVALID"} />
      <p className="hint" style={{ marginTop: "0.6rem" }}>
        {result.message}
      </p>
      {result.errors.length > 0 && (
        <ul className="error-list">
          {result.errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
