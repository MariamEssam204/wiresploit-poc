/**
 * Module: UartInjection
 * Purpose: UART injection page: node setup and action builder on the left,
 *          execution history on the right.
 * Owner: Injection team
 */
import { useState } from "react";
import NodePanel from "../components/NodePanel";
import UartActionBuilder from "../components/UartActionBuilder";
import UartInjectionHistory from "../components/UartInjectionHistory";
import { useActionHistory } from "../hooks/useActionHistory";
import { readUartHistory } from "../services/uartApi";
import type { NodeConfig } from "../types/networkAction";

interface UartInjectionProps {
  isCapturing?: boolean;
}

export default function UartInjection({ isCapturing }: UartInjectionProps) {
  const [node, setNode] = useState<NodeConfig | null>(null);
  const { history, historyError, reloadHistory } = useActionHistory(readUartHistory);

  return (
    <div className="injection-page">
      <div>
        <NodePanel onNodeChange={setNode} />
        <UartActionBuilder onExecuted={reloadHistory} node={node} isCapturing={isCapturing} />
      </div>
      <div>
        {historyError && <p className="error-text">Could not load history: {historyError}</p>}
        <UartInjectionHistory history={history} />
      </div>
    </div>
  );
}
