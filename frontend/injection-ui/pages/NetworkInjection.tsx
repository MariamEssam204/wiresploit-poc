/**
 * Module: NetworkInjection
 * Purpose: Network injection page: node setup and action builder on the
 *          left, execution history on the right.
 * Owner: Injection team
 */
import { useState } from "react";
import ActionBuilder from "../components/ActionBuilder";
import InjectionHistory from "../components/InjectionHistory";
import NodePanel from "../components/NodePanel";
import { useActionHistory } from "../hooks/useActionHistory";
import { readHistory } from "../services/api";
import type { NodeConfig } from "../types/networkAction";

interface NetworkInjectionProps {
  isCapturing?: boolean;
}

export default function NetworkInjection({ isCapturing }: NetworkInjectionProps) {
  const [node, setNode] = useState<NodeConfig | null>(null);
  const { history, historyError, reloadHistory } = useActionHistory(readHistory);

  return (
    <div className="injection-page">
      <div>
        <NodePanel onNodeChange={setNode} />
        <ActionBuilder onExecuted={reloadHistory} node={node} isCapturing={isCapturing} />
      </div>
      <div>
        {historyError && <p className="error-text">Could not load history: {historyError}</p>}
        <InjectionHistory history={history} />
      </div>
    </div>
  );
}
