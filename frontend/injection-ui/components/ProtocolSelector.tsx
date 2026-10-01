import { TEST_TYPES_BY_PROTOCOL, type Protocol, type TestType } from "../types/networkAction";

interface Props {
  protocol: Protocol;
  testType: TestType;
  onProtocolChange: (p: Protocol) => void;
  onTestTypeChange: (t: TestType) => void;
}

export default function ProtocolSelector({
  protocol,
  testType,
  onProtocolChange,
  onTestTypeChange,
}: Props) {
  const testTypes = TEST_TYPES_BY_PROTOCOL[protocol];

  return (
    <div className="field-row">
      <div className="field">
        <label htmlFor="protocol">Protocol</label>
        <select
          id="protocol"
          value={protocol}
          onChange={(e) => {
            const next = e.target.value as Protocol;
            onProtocolChange(next);
            onTestTypeChange(TEST_TYPES_BY_PROTOCOL[next][0].value);
          }}
        >
          <option value="ICMP">ICMP</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="test-type">Test Type</label>
        <select id="test-type" value={testType} onChange={(e) => onTestTypeChange(e.target.value as TestType)}>
          {testTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
