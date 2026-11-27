/**
 * Module: HistoryPanel
 * Purpose: Generic table of executed injection actions. Click a row to see
 *          its full JSON. Each domain supplies its own columns.
 * Owner: Injection team
 */
import { useState, type ReactNode } from "react";

export interface HistoryColumn<T> {
  label: string;
  render: (entry: T) => ReactNode;
}

interface HistoryPanelProps<T> {
  title: string;
  entries: T[];
  columns: HistoryColumn<T>[];
  getEntryKey: (entry: T) => string;
  emptyMessage: string;
}

export default function HistoryPanel<T>({
  title,
  entries,
  columns,
  getEntryKey,
  emptyMessage,
}: HistoryPanelProps<T>) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedEntry = entries.find((entry) => getEntryKey(entry) === selectedKey) ?? null;

  return (
    <div className="panel injection-history">
      <h2>{title}</h2>
      {entries.length === 0 ? (
        <p className="empty-hint">{emptyMessage}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.label}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const entryKey = getEntryKey(entry);
              const isSelected = entryKey === selectedKey;
              return (
                <tr
                  key={entryKey}
                  className={"is-clickable" + (isSelected ? " is-selected" : "")}
                  onClick={() => setSelectedKey(isSelected ? null : entryKey)}
                >
                  {columns.map((column) => (
                    <td key={column.label}>{column.render(entry)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selectedEntry && <div className="code-block">{JSON.stringify(selectedEntry, null, 2)}</div>}
    </div>
  );
}
