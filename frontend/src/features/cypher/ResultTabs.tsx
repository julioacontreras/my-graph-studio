import { useState } from "react";
import { Tabs } from "../../components/Tabs";
import type { Graph, QueryResult } from "../../types/graph";
import { GraphView, type Selection } from "../graph/GraphView";
import { JsonView } from "./JsonView";
import { TableView } from "./TableView";

type View = "graph" | "table" | "json";

export function ResultTabs({
  result,
  graph,
  selection,
  onSelect,
  onExpand,
}: {
  result: QueryResult;
  graph: Graph;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onExpand: (id: number) => void;
}) {
  const hasGraph = result.graph.nodes.length > 0;
  const [view, setView] = useState<View>(hasGraph ? "graph" : "table");
  const active = !hasGraph && view === "graph" ? "table" : view;

  return (
    <div className="flex h-full flex-col">
      <div className="px-2">
        <Tabs
          value={active}
          onChange={setView}
          tabs={[
            { id: "graph", label: "Grafo" },
            { id: "table", label: "Tabla" },
            { id: "json", label: "JSON" },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1">
        {active === "graph" && <GraphView graph={graph} selection={selection} onSelect={onSelect} onExpand={onExpand} />}
        {active === "table" && <TableView result={result} />}
        {active === "json" && <JsonView result={result} />}
      </div>
    </div>
  );
}
