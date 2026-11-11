import type { QueryResult } from "../../types/graph";

/** Respuesta cruda del gateway. */
export function JsonView({ result }: { result: QueryResult }) {
  return (
    <pre className="h-full overflow-auto p-4 text-xs leading-5 text-fg">{JSON.stringify(result, null, 2)}</pre>
  );
}
