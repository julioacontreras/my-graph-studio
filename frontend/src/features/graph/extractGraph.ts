import type { Graph, GraphNode, GraphRelationship } from "../../types/graph";

/**
 * El gateway ya devuelve `graph: {nodes, relationships}` extraído de todas las
 * celdas. Aquí solo se combinan grafos (expandir un nodo) y se preparan los
 * objetos que necesita D3. `source`/`target` existen solo en este módulo.
 */

export interface SimNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimLink extends GraphRelationship {
  source: SimNode;
  target: SimNode;
  /** Índice entre relaciones del mismo par de nodos, para curvarlas. */
  parallel: number;
}

export function mergeGraphs(a: Graph, b: Graph): Graph {
  const nodes = new Map(a.nodes.map((n) => [n.id, n]));
  for (const n of b.nodes) nodes.set(n.id, n);
  const rels = new Map(a.relationships.map((r) => [r.id, r]));
  for (const r of b.relationships) rels.set(r.id, r);
  return { nodes: [...nodes.values()], relationships: [...rels.values()] };
}

export function removeFromGraph(g: Graph, kind: "node" | "relationship", id: number): Graph {
  if (kind === "relationship") return { ...g, relationships: g.relationships.filter((r) => r.id !== id) };
  return {
    nodes: g.nodes.filter((n) => n.id !== id),
    relationships: g.relationships.filter((r) => r.start !== id && r.end !== id),
  };
}

export function replaceNode(g: Graph, node: GraphNode): Graph {
  return { ...g, nodes: g.nodes.map((n) => (n.id === node.id ? node : n)) };
}

export function replaceRelationship(g: Graph, rel: GraphRelationship): Graph {
  return { ...g, relationships: g.relationships.map((r) => (r.id === rel.id ? rel : r)) };
}

/**
 * Convierte el grafo en objetos de simulación, reutilizando las posiciones de
 * `previous` para que el grafo no salte al expandir o editar.
 */
export function toSimulation(g: Graph, previous: Map<number, SimNode>): { nodes: SimNode[]; links: SimLink[] } {
  const nodes = g.nodes.map((n) => {
    const old = previous.get(n.id);
    return old ? Object.assign(old, n) : ({ ...n } as SimNode);
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pairCount = new Map<string, number>();
  const links: SimLink[] = [];
  for (const r of g.relationships) {
    const source = byId.get(r.start);
    const target = byId.get(r.end);
    if (!source || !target) continue; // relación cuyo nodo no está en el resultado
    const key = r.start < r.end ? `${r.start}-${r.end}` : `${r.end}-${r.start}`;
    const parallel = pairCount.get(key) ?? 0;
    pairCount.set(key, parallel + 1);
    links.push({ ...r, source, target, parallel });
  }
  return { nodes, links };
}
