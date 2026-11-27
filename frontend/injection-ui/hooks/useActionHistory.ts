/**
 * Module: useActionHistory
 * Purpose: Load an injection domain's action history and reload it after
 *          an execution. Load failures are reported, not swallowed.
 * Owner: Injection team
 */
import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../lib/format";

/**
 * @param readHistory Service call that returns the domain's history.
 * @returns The history, the last load error (or null), and a reload function.
 */
export function useActionHistory<T>(readHistory: () => Promise<T[]>) {
  const [history, setHistory] = useState<T[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const reloadHistory = useCallback(() => {
    readHistory()
      .then((entries) => {
        setHistory(entries);
        setHistoryError(null);
      })
      .catch((error) => setHistoryError(getErrorMessage(error)));
  }, [readHistory]);

  useEffect(() => {
    reloadHistory();
  }, [reloadHistory]);

  return { history, historyError, reloadHistory };
}
