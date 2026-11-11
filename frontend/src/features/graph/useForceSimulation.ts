import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import type { Graph } from "../../types/graph";
import { toSimulation, type SimLink, type SimNode } from "./extractGraph";

export function useForceSimulation(graph: Graph, width: number, height: number) {
  const positions = useRef(new Map<number, SimNode>());
  const sim = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const [data, setData] = useState<{ nodes: SimNode[]; links: SimLink[] }>({ nodes: [], links: [] });
  const [, setTick] = useState(0);

  useEffect(() => {
    const next = toSimulation(graph, positions.current);
    positions.current = new Map(next.nodes.map((n) => [n.id, n]));
    setData(next);

    sim.current?.stop();
    const s = d3
      .forceSimulation<SimNode, SimLink>(next.nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(next.links).id((n) => n.id).distance(110))
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(30))
      .on("tick", () => setTick((t) => t + 1));
    sim.current = s;
    return () => {
      s.stop();
    };
    // width/height solo cambian el centro; no reinician la simulación.
  }, [graph]);

  useEffect(() => {
    sim.current?.force("center", d3.forceCenter(width / 2, height / 2)).alpha(0.3).restart();
  }, [width, height]);

  return { ...data, simulation: sim };
}
