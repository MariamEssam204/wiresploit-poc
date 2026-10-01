import { useCallback, useEffect, useState } from "react";
import ActionBuilder from "../components/ActionBuilder";
import InjectionHistory from "../components/InjectionHistory";
import NodePanel from "../components/NodePanel";
import { fetchHistory } from "../services/api";
import type { ExecutionResult, NodeConfig } from "../types/networkAction";

export default function NetworkInjection({ capturing }: { capturing?: boolean }) {
  const [history, setHistory] = useState<ExecutionResult[]>([]);
  const [node, setNode] = useState<NodeConfig | null>(null);

  const reloadHistory = useCallback(() => {
    fetchHistory()
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
        <ActionBuilder onExecuted={reloadHistory} node={node} capturing={capturing} />
      </div>
      <InjectionHistory history={history} />
    </div>
  );
}
