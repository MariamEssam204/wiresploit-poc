export type DataBits = 5 | 6 | 7 | 8;
export type Parity = "none" | "even" | "odd" | "mark" | "space";
export type StopBits = 1 | 1.5 | 2;
export type FlowControl = "none" | "rts_cts" | "xon_xoff";
export type UartPayloadFormat = "text" | "hex";

export const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

export interface UartInterface {
  name: string;
  type: string;
  available: boolean;
}

export interface UARTConfiguration {
  baud_rate: number;
  data_bits: DataBits;
  parity: Parity;
  stop_bits: StopBits;
  flow_control: FlowControl;
}

export interface UARTPayload {
  format: UartPayloadFormat;
  value: string;
}

export interface UARTAction {
  action_id?: string | null;
  domain: "uart_injection";
  interface: string;
  configuration: UARTConfiguration;
  payload: UARTPayload;
  timeout: number;
  compare_response: boolean;
}

export interface UARTValidationResult {
  valid: boolean;
  action_id?: string | null;
  errors: string[];
  message: string;
}

export interface UARTExecutionResult {
  action_id: string;
  status: string;
  interface: string;
  configuration: UARTConfiguration;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  message: string;
  error?: string | null;
  transmitted_bytes?: number | null;
  received_bytes?: number | null;
  received_hex?: string | null;
  match?: boolean | null;
  packet_summary?: string | null;
  node_id?: string | null;
  node_type?: "raspberry_pi" | null;
}
