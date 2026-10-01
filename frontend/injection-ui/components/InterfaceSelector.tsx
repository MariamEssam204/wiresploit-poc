import type { NetworkInterface } from "../types/networkAction";

interface Props {
  interfaces: NetworkInterface[];
  value: string;
  onChange: (value: string) => void;
}

export default function InterfaceSelector({ interfaces, value, onChange }: Props) {
  return (
    <div className="field">
      <label htmlFor="interface">Interface</label>
      <select id="interface" value={value} onChange={(e) => onChange(e.target.value)}>
        {interfaces.length === 0 && <option value="">No interfaces detected</option>}
        {interfaces.map((iface) => (
          <option key={iface.name} value={iface.name}>
            {iface.name}
            {iface.description && iface.description !== iface.name ? ` — ${iface.description}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
