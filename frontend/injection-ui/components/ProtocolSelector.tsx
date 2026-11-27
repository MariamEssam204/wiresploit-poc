/**
 * Module: ProtocolSelector
 * Purpose: Protocol and test-type dropdowns for a network action. Changing
 *          the protocol resets the test type to that protocol's first test.
 * Owner: Injection team
 */
import { TEST_TYPES_BY_PROTOCOL, type Protocol, type TestType } from "../types/networkAction";

const PROTOCOLS = Object.keys(TEST_TYPES_BY_PROTOCOL) as Protocol[];

interface ProtocolSelectorProps {
  protocol: Protocol;
  testType: TestType;
  onProtocolChange: (protocol: Protocol) => void;
  onTestTypeChange: (testType: TestType) => void;
}

export default function ProtocolSelector({
  protocol,
  testType,
  onProtocolChange,
  onTestTypeChange,
}: ProtocolSelectorProps) {
  const handleProtocolChange = (nextProtocol: Protocol) => {
    onProtocolChange(nextProtocol);
    onTestTypeChange(TEST_TYPES_BY_PROTOCOL[nextProtocol][0].value);
  };

  return (
    <div className="field-row">
      <div className="field">
        <label htmlFor="protocol">Protocol</label>
        <select
          id="protocol"
          value={protocol}
          onChange={(event) => handleProtocolChange(event.target.value as Protocol)}
        >
          {PROTOCOLS.map((protocolName) => (
            <option key={protocolName} value={protocolName}>
              {protocolName}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="test-type">Test type</label>
        <select
          id="test-type"
          value={testType}
          onChange={(event) => onTestTypeChange(event.target.value as TestType)}
        >
          {TEST_TYPES_BY_PROTOCOL[protocol].map((testOption) => (
            <option key={testOption.value} value={testOption.value}>
              {testOption.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
