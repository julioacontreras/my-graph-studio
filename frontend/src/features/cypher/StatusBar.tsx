import type { QueryResult, Stats } from "../../types/graph";

const LABELS: Record<keyof Stats, string> = {
  nodes_created: "nodos creados",
  nodes_deleted: "nodos borrados",
  relationships_created: "relaciones creadas",
  relationships_deleted: "relaciones borradas",
  properties_set: "propiedades",
  labels_added: "etiquetas añadidas",
  labels_removed: "etiquetas quitadas",
};

export function StatusBar({ result, running }: { result: QueryResult | null; running: boolean }) {
  const stats = result
    ? (Object.keys(LABELS) as (keyof Stats)[]).filter((k) => result.stats[k] > 0).map((k) => `${result.stats[k]} ${LABELS[k]}`)
    : [];
  return (
    <div className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-surface px-4 font-mono text-[11px] text-muted">
      {running && <span>Ejecutando…</span>}
      {result && !running && (
        <>
          <span>
            {result.rows.length} filas · {result.elapsed_ms} ms
          </span>
          {stats.length > 0 && <span className="text-ok">{stats.join(", ")}</span>}
          <span className="ml-auto">
            {result.database}/{result.schema}
          </span>
        </>
      )}
    </div>
  );
}
