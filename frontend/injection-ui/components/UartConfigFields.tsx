/**
 * Module: UartConfigFields
 * Purpose: Serial line settings for a UART action: baud rate, data bits,
 *          parity, stop bits and flow control.
 * Owner: Injection team
 */
import {
  BAUD_RATES,
  DATA_BITS_OPTIONS,
  FLOW_CONTROL_OPTIONS,
  PARITY_OPTIONS,
  STOP_BITS_OPTIONS,
  type DataBits,
  type FlowControl,
  type Parity,
  type StopBits,
  type UARTConfiguration,
} from "../types/uartAction";

interface UartConfigFieldsProps {
  configuration: UARTConfiguration;
  onChange: (patch: Partial<UARTConfiguration>) => void;
}

export default function UartConfigFields({ configuration, onChange }: UartConfigFieldsProps) {
  return (
    <>
      <div className="field-row">
        <div className="field">
          <label htmlFor="baud-rate">Baud rate</label>
          <select
            id="baud-rate"
            value={configuration.baud_rate}
            onChange={(event) => onChange({ baud_rate: Number(event.target.value) })}
          >
            {BAUD_RATES.map((baudRate) => (
              <option key={baudRate} value={baudRate}>
                {baudRate}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="data-bits">Data bits</label>
          <select
            id="data-bits"
            value={configuration.data_bits}
            onChange={(event) => onChange({ data_bits: Number(event.target.value) as DataBits })}
          >
            {DATA_BITS_OPTIONS.map((dataBits) => (
              <option key={dataBits} value={dataBits}>
                {dataBits}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="parity">Parity</label>
          <select
            id="parity"
            value={configuration.parity}
            onChange={(event) => onChange({ parity: event.target.value as Parity })}
          >
            {PARITY_OPTIONS.map((parity) => (
              <option key={parity} value={parity}>
                {parity}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="stop-bits">Stop bits</label>
          <select
            id="stop-bits"
            value={configuration.stop_bits}
            onChange={(event) => onChange({ stop_bits: Number(event.target.value) as StopBits })}
          >
            {STOP_BITS_OPTIONS.map((stopBits) => (
              <option key={stopBits} value={stopBits}>
                {stopBits}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="flow-control">Flow control</label>
        <select
          id="flow-control"
          value={configuration.flow_control}
          onChange={(event) => onChange({ flow_control: event.target.value as FlowControl })}
        >
          {FLOW_CONTROL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
