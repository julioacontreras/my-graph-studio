import type { Scope } from "../types/graph";
import type { CypherPreview, GraphDump, ImportMode, ImportResult } from "../types/transfer";
import { request, url } from "./client";

/** URL de descarga directa; el gateway envía Content-Disposition. */
export const exportUrl = (scope: Scope, format: "json" | "cypher") => url("/graph/export", scope, { format });

export const importGraph = (scope: Scope, dump: GraphDump, mode: ImportMode) =>
  request<ImportResult>("POST", "/graph/import", { scope, query: { mode }, body: dump });

export const previewCypher = (script: string) =>
  request<CypherPreview>("POST", "/graph/import/cypher/preview", { body: { script } });

export const importCypher = (scope: Scope, script: string, mode: ImportMode) =>
  request<ImportResult>("POST", "/graph/import/cypher", { scope, query: { mode }, body: { script } });
