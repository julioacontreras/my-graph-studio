import { formatCell } from "../../lib/format";
import type { QueryResult } from "../../types/graph";

export function TableView({ result }: { result: QueryResult }) {
  if (result.columns.length === 0) return <p className="p-4 text-sm text-muted">La consulta no devolvió columnas.</p>;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="border-b border-line px-3 py-2 text-left font-semibold text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface">
              {row.map((cell, j) => (
                <td key={j} className="max-w-md truncate border-b border-line/50 px-3 py-1.5" title={formatCell(cell)}>
                  {formatCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.rows.length === 0 && <p className="p-4 text-sm text-muted">Sin filas.</p>}
    </div>
  );
}
