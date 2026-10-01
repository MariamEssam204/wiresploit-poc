import type { Payload, PayloadFormat } from "../types/networkAction";

interface Props {
  payload: Payload;
  onChange: (payload: Payload) => void;
  required?: boolean;
}

export default function PayloadEditor({ payload, onChange, required }: Props) {
  return (
    <>
      <div className="field">
        <label htmlFor="payload-value">
          Payload{required ? "" : " (optional)"}
        </label>
        <textarea
          id="payload-value"
          value={payload.value}
          placeholder={payload.format === "hex" ? "01 02 03 04" : "HELLO"}
          onChange={(e) => onChange({ ...payload, value: e.target.value })}
        />
        <div className="hint">
          {payload.format === "hex"
            ? "Space-separated hex byte pairs, e.g. 50 49 4E 47"
            : "Plain UTF-8 text"}
        </div>
      </div>
      <div className="field">
        <label htmlFor="payload-format">Payload Format</label>
        <select
          id="payload-format"
          value={payload.format}
          onChange={(e) => onChange({ ...payload, format: e.target.value as PayloadFormat })}
        >
          <option value="text">Text</option>
          <option value="hex">Hex</option>
        </select>
      </div>
    </>
  );
}
