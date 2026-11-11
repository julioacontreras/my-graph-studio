import { Play } from "lucide-react";
import { useCallback, useState } from "react";
import { executeCypher } from "../../api/cypher";
import { Button } from "../../components/Button";
import { ErrorBox } from "../../components/ErrorBox";
import { useLabels } from "../../state/LabelsContext";
import { useSession } from "../../state/SessionContext";
import { ApiError } from "../../types/errors";
import type { Graph, QueryResult } from "../../types/graph";
import type { Selection } from "../graph/GraphView";
import { Inspector } from "../graph/Inspector";
import { useExpandNode } from "../graph/useExpandNode";
import { CypherEditor, type EditorError } from "./CypherEditor";
import { ResultTabs } from "./ResultTabs";
import { StatusBar } from "./StatusBar";

/** Incluye los nodos sin relaciones; `MATCH (n)-[r]->(m)` no los devolvería. */
export const INITIAL_QUERY = "MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 500";
const MAX_NODES = 2000;

export function CypherPage() {
  const { scope } = useSession();
  const { reload: reloadLabels } = useLabels();
  const [query, setQuery] = useState(INITIAL_QUERY);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [graph, setGraphState] = useState<Graph>({ nodes: [], relationships: [] });
  const [error, setError] = useState<unknown>(null);
  const [running, setRunning] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);

  const setGraph = useCallback((update: (g: Graph) => Graph) => setGraphState(update), []);
  const { expand, error: expandError } = useExpandNode(setGraph);

  const run = useCallback(async () => {
    if (!query.trim()) return;
    setRunning(true);
    try {
      const r = await executeCypher(scope, query);
      setResult(r);
      setGraphState(r.graph);
      setSelection(null);
      setError(null);
      const s = r.stats;
      if (s.nodes_created || s.nodes_deleted || s.labels_added || s.labels_removed) void reloadLabels();
    } catch (e) {
      setError(e);
    } finally {
      setRunning(false);
    }
  }, [query, scope, reloadLabels]);

  const editorError: EditorError | null =
    error instanceof ApiError && error.line ? { line: error.line, column: error.column ?? 1 } : null;

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-44 shrink-0 flex-col border-b border-line">
          <div className="min-h-0 flex-1">
            <CypherEditor value={query} onChange={setQuery} onRun={() => void run()} error={editorError} />
          </div>
          <div className="flex items-center justify-between border-t border-line bg-surface px-3 py-1.5">
            <span className="text-xs text-muted">Ctrl/Cmd + Enter para ejecutar. Varias sentencias separadas por ;</span>
            <Button variant="primary" onClick={() => void run()} disabled={running}>
              <Play size={14} /> Ejecutar
            </Button>
          </div>
        </div>

        {Boolean(error || expandError) && (
          <div className="p-3">
            <ErrorBox error={error ?? expandError} />
          </div>
        )}
        {result && graph.nodes.length > MAX_NODES && (
          <div className="mx-3 mt-3 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            El resultado tiene {graph.nodes.length} nodos. La vista grafo puede ir lenta: añade un LIMIT a la consulta.
          </div>
        )}

        <div className="min-h-0 flex-1">
          {result ? (
            <ResultTabs result={result} graph={graph} selection={selection} onSelect={setSelection} onExpand={expand} />
          ) : (
            <p className="p-6 text-sm text-muted">Ejecuta una consulta para ver el resultado.</p>
          )}
        </div>
        <StatusBar result={result} running={running} />
      </div>

      {selection && (
        <Inspector graph={graph} selection={selection} setGraph={setGraph} onClose={() => setSelection(null)} />
      )}
    </div>
  );
}
