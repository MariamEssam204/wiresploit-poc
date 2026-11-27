/**
 * Module: InterfaceSelector
 * Purpose: Dropdown of network interfaces for a network action.
 * Owner: Injection team
 */
import type { NetworkInterface } from "../types/networkAction";

interface InterfaceSelectorProps {
  interfaces: NetworkInterface[];
  value: string;
  onChange: (interfaceName: string) => void;
}

function buildInterfaceLabel(networkInterface: NetworkInterface): string {
  const hasDistinctDescription =
    networkInterface.description && networkInterface.description !== networkInterface.name;
  return hasDistinctDescription
    ? `${networkInterface.name} — ${networkInterface.description}`
    : networkInterface.name;
}

export default function InterfaceSelector({ interfaces, value, onChange }: InterfaceSelectorProps) {
  return (
    <div className="field">
      <label htmlFor="interface">Interface</label>
      <select id="interface" value={value} onChange={(event) => onChange(event.target.value)}>
        {interfaces.length === 0 && <option value="">No interfaces detected</option>}
        {interfaces.map((networkInterface) => (
          <option key={networkInterface.name} value={networkInterface.name}>
            {buildInterfaceLabel(networkInterface)}
          </option>
        ))}
      </select>
    </div>
  );
}
