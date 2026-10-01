export type Protocol = "ICMP" | "TCP" | "UDP";

export type TestType = "echo" | "connection" | "application_data" | "datagram";

export type PayloadFormat = "text" | "hex";

export const TEST_TYPES_BY_PROTOCOL: Record<Protocol, { value: TestType; label: string }[]> = {
  ICMP: [{ value: "echo", label: "Echo Test" }],
  TCP: [
    { value: "connection", label: "Connection Test" },
    { value: "application_data", label: "Application Data Test" },
  ],
  UDP: [{ value: "datagram", label: "Datagram Test" }],
};

export interface Target {
  address: string;
  port?: number | null;
}

export interface Payload {
  format: PayloadFormat;
  value: string;
}

export interface NetworkAction {
  action_id?: string | null;
  domain: "network_injection";
  protocol: Protocol;
  test_type: TestType;
  interface: string;
  target: Target;
  payload?: Payload | null;
  timeout: number;
}

export interface ValidationResult {
  valid: boolean;
  action_id?: string | null;
  errors: string[];
  message: string;
}

export type ActionStatus =
  | "pending"
  | "validated"
  | "invalid"
  | "running"
  | "success"
  | "failed"
  | "aborted";

export interface ExecutionResult {
  action_id: string;
  status: ActionStatus;
  protocol: Protocol;
  test_type: TestType;
  interface: string;
  target: Target;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  message: string;
  error?: string | null;
  packet_summary?: string | null;
  node_id?: string | null;
  node_type?: "pc_local" | "raspberry_pi" | null;
}

export interface NetworkInterface {
  name: string;
  description: string;
}

export interface NodeConfig {
  node_id: string;
  address: string;
  port: number;
}

export interface NodeStatus {
  node_id?: string | null;
  address?: string | null;
  port?: number | null;
  connected: boolean;
  node_status?: string | null;
  scapy?: boolean | null;
  detail?: string | null;
}
