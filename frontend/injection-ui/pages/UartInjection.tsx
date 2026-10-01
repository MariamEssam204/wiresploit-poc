import { useCallback, useEffect, useState } from "react";
import NodePanel from "../components/NodePanel";
import UartActionBuilder from "../components/UartActionBuilder";
import UartInjectionHistory from "../components/UartInjectionHistory";
import { fetchUartHistory } from "../services/uartApi";
import type { NodeConfig } from "../types/networkAction";
import type { UARTExecutionResult } from "../types/uartAction";

export default function UartInjection({ capturing }: { capturing?: boolean }) {
  const [history, setHistory] = useState<UARTExecutionResult[]>([]);
  const [node, setNode] = useState<NodeConfig | null>(null);

  const reloadHistory = useCallback(() => {
    fetchUartHistory()
      .then(setHistory)
      .catch(() => {});
  }, []);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  return (
    <div className="app-body">
      <div>
        <NodePanel onNodeChange={setNode} />
        <UartActionBuilder onExecuted={reloadHistory} node={node} capturing={capturing} />
      </div>
      <UartInjectionHistory history={history} />
    </div>
  );
}
