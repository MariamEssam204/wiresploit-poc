interface Props {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: Props) {
  return <span className={`status-badge ${status}`}>{label ?? status.replace("_", " ")}</span>;
}
