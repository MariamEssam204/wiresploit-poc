/**
 * Module: PayloadEditor
 * Purpose: Payload text box and format (text / hex) selector, shared by the
 *          network and UART builders.
 * Owner: Injection team
 */
import type { Payload, PayloadFormat } from "../types/networkAction";

const PAYLOAD_PLACEHOLDER: Record<PayloadFormat, string> = {
  hex: "01 02 03 04",
  text: "HELLO",
};

const PAYLOAD_HINT: Record<PayloadFormat, string> = {
  hex: "Space-separated hex byte pairs, e.g. 50 49 4E 47",
  text: "Plain UTF-8 text",
};

interface PayloadEditorProps {
  payload: Payload;
  onChange: (payload: Payload) => void;
  isRequired?: boolean;
  idPrefix?: string;
}

export default function PayloadEditor({
  payload,
  onChange,
  isRequired = false,
  idPrefix = "payload",
}: PayloadEditorProps) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-value`}>Payload{isRequired ? "" : " (optional)"}</label>
        <textarea
          id={`${idPrefix}-value`}
          value={payload.value}
          placeholder={PAYLOAD_PLACEHOLDER[payload.format]}
          onChange={(event) => onChange({ ...payload, value: event.target.value })}
        />
        <div className="hint">{PAYLOAD_HINT[payload.format]}</div>
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-format`}>Payload format</label>
        <select
          id={`${idPrefix}-format`}
          value={payload.format}
          onChange={(event) => onChange({ ...payload, format: event.target.value as PayloadFormat })}
        >
          <option value="text">Text</option>
          <option value="hex">Hex</option>
        </select>
      </div>
    </>
  );
}
