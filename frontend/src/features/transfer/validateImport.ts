import type { GraphDump } from "../../types/transfer";

export interface ImportSummary {
  nodes: number;
  relationships: number;
  labels: string[];
  relationshipTypes: string[];
  definitions: number;
}

export type ImportCheck = { ok: true; dump: GraphDump; summary: ImportSummary } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Valida la estructura del JSON de export antes de enviarlo al gateway. */
export function validateImport(raw: unknown): ImportCheck {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ["El fichero no es un objeto JSON."] };
  if (raw.format !== "mygraph-studio") errors.push('Falta "format": "mygraph-studio". ¿Es un export del Studio?');
  if (!Array.isArray(raw.nodes)) errors.push('Falta la lista "nodes".');
  if (!Array.isArray(raw.relationships)) errors.push('Falta la lista "relationships".');
  if (errors.length) return { ok: false, errors };

  const nodes = raw.nodes as unknown[];
  const rels = raw.relationships as unknown[];
  const ids = new Set<number>();
  const labels = new Set<string>();
  const types = new Set<string>();

  nodes.forEach((n, i) => {
    if (!isObj(n) || typeof n.id !== "number" || !Array.isArray(n.labels) || !isObj(n.properties)) {
      errors.push(`Nodo ${i}: necesita id, labels y properties.`);
      return;
    }
    if (ids.has(n.id)) errors.push(`Nodo ${i}: id ${n.id} repetido.`);
    ids.add(n.id);
    (n.labels as string[]).forEach((l) => labels.add(l));
  });
  rels.forEach((r, i) => {
    if (!isObj(r) || typeof r.type !== "string" || typeof r.start !== "number" || typeof r.end !== "number") {
      errors.push(`Relación ${i}: necesita type, start y end.`);
      return;
    }
    if (!ids.has(r.start) || !ids.has(r.end)) errors.push(`Relación ${i}: apunta a un nodo que no está en el fichero.`);
    types.add(r.type);
  });

  if (errors.length) return { ok: false, errors: errors.slice(0, 20) };
  const dump = raw as unknown as GraphDump;
  return {
    ok: true,
    dump,
    summary: {
      nodes: nodes.length,
      relationships: rels.length,
      labels: [...labels].sort(),
      relationshipTypes: [...types].sort(),
      definitions: Array.isArray(dump.labels) ? dump.labels.length : 0,
    },
  };
}
