import { useCallback, useState } from "react";
import { getNeighbors } from "../../api/nodes";
import { useSession } from "../../state/SessionContext";
import type { Graph } from "../../types/graph";
import { mergeGraphs } from "./extractGraph";

/** Doble clic en un nodo: añade sus vecinos al grafo mostrado. */
export function useExpandNode(setGraph: (update: (g: Graph) => Graph) => void) {
  const { scope } = useSession();
  const [error, setError] = useState<unknown>(null);
  const expand = useCallback(
    async (id: number) => {
      try {
        const neighbors = await getNeighbors(scope, id);
        setGraph((g) => mergeGraphs(g, neighbors));
        setError(null);
      } catch (e) {
        setError(e);
      }
    },
    [scope, setGraph],
  );
  return { expand, error };
}
