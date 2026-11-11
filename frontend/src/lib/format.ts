import type { GraphNode, GraphRelationship } from "../types/graph";

export function isNode(v: unknown): v is GraphNode {
  return typeof v === "object" && v !== null && "labels" in v && "properties" in v && "id" in v;
}

export function isRelationship(v: unknown): v is GraphRelationship {
  return typeof v === "object" && v !== null && "type" in v && "start" in v && "end" in v;
}

/** Texto corto para mostrar un nodo: la primera propiedad de texto conocida o el id. */
export function nodeCaption(n: GraphNode): string {
  for (const k of ["name", "title", "label", "id", "email"]) {
    const v = n.properties[k];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return `#${n.id}`;
}

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (isNode(v)) return `(${v.labels.map((l) => ":" + l).join("")} #${v.id})`;
  if (isRelationship(v)) return `[:${v.type} #${v.id}]`;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Valor tecleado por el usuario → valor JSON (`42` es número, `"42"` o `42a` es texto). */
export function parseValue(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function stringifyValue(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}
