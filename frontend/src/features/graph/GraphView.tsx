import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { nodeCaption } from "../../lib/format";
import { textOn } from "../../lib/contrast";
import { useLabels } from "../../state/LabelsContext";
import type { Graph } from "../../types/graph";
import type { SimLink, SimNode } from "./extractGraph";
import { useForceSimulation } from "./useForceSimulation";

export type Selection = { kind: "node"; id: number } | { kind: "relationship"; id: number } | null;

const R = 22;

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}

function linkPath(l: SimLink): string {
  const { x: x1 = 0, y: y1 = 0 } = l.source;
  const { x: x2 = 0, y: y2 = 0 } = l.target;
  if (l.source.id === l.target.id) {
    return `M${x1},${y1 - R} C${x1 + 70},${y1 - 80} ${x1 - 70},${y1 - 80} ${x1},${y1 - R}`;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  // Recorta en el borde del círculo destino para que se vea la flecha.
  const ex = x2 - (dx / dist) * (R + 3);
  const ey = y2 - (dy / dist) * (R + 3);
  if (l.parallel === 0) return `M${x1},${y1} L${ex},${ey}`;
  const bend = 24 * Math.ceil(l.parallel / 2) * (l.parallel % 2 ? 1 : -1);
  const mx = (x1 + x2) / 2 - (dy / dist) * bend;
  const my = (y1 + y2) / 2 + (dx / dist) * bend;
  return `M${x1},${y1} Q${mx},${my} ${ex},${ey}`;
}

export function GraphView({
  graph,
  selection,
  onSelect,
  onExpand,
}: {
  graph: Graph;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onExpand: (nodeId: number) => void;
}) {
  const { ref, width, height } = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const { nodes, links, simulation } = useForceSimulation(graph, width, height);
  const { colorFor } = useLabels();

  useEffect(() => {
    if (!svgRef.current) return;
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (e) => setTransform(e.transform));
    d3.select(svgRef.current).call(zoom).on("dblclick.zoom", null);
  }, []);

  function startDrag(e: React.PointerEvent, n: SimNode) {
    e.stopPropagation();
    const svg = svgRef.current!;
    const s = simulation.current;
    s?.alphaTarget(0.3).restart();
    const move = (ev: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const [x, y] = transform.invert([ev.clientX - rect.left, ev.clientY - rect.top]);
      n.fx = x;
      n.fy = y;
    };
    const up = () => {
      s?.alphaTarget(0);
      n.fx = null;
      n.fy = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-bg">
      {graph.nodes.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-muted">
          El resultado no contiene nodos ni relaciones.
        </p>
      )}
      <svg ref={svgRef} width={width} height={height} onClick={() => onSelect(null)} className="cursor-grab">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-muted)" />
          </marker>
          <marker id="arrow-selected" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-violet)" />
          </marker>
          <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#006cfc" />
            <stop offset="100%" stopColor="#8b2cf5" />
          </linearGradient>
        </defs>
        <g transform={transform.toString()}>
          {links.map((l) => {
            const selected = selection?.kind === "relationship" && selection.id === l.id;
            const d = linkPath(l);
            return (
              <g
                key={l.id}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ kind: "relationship", id: l.id });
                }}
              >
                <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                <path
                  id={`rel-${l.id}`}
                  d={d}
                  fill="none"
                  stroke={selected ? "var(--color-violet)" : "var(--color-line)"}
                  strokeWidth={selected ? 2.5 : 1.5}
                  markerEnd={`url(#${selected ? "arrow-selected" : "arrow"})`}
                />
                <text className="pointer-events-none fill-muted font-mono" fontSize={9} dy={-3}>
                  <textPath href={`#rel-${l.id}`} startOffset="50%" textAnchor="middle">
                    {l.type}
                  </textPath>
                </text>
              </g>
            );
          })}
          {nodes.map((n) => {
            const selected = selection?.kind === "node" && selection.id === n.id;
            const color = colorFor(n.labels);
            const caption = nodeCaption(n);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
                className="cursor-pointer"
                onPointerDown={(e) => startDrag(e, n)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ kind: "node", id: n.id });
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onExpand(n.id);
                }}
              >
                {selected && <circle r={R + 4} fill="none" stroke="url(#brand)" strokeWidth={3} />}
                <circle r={R} fill={color} />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={10}
                  fill={textOn(color)}
                  className="pointer-events-none select-none"
                >
                  {caption.length > 10 ? caption.slice(0, 9) + "…" : caption}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
