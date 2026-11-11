import type { GraphNode, GraphRelationship } from "./graph";
import type { LabelDefinitionInput } from "./labels";

export interface GraphDump {
  format: "mygraph-studio";
  version: number;
  database: string;
  schema: string;
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  indexes: { label: string; property: string }[];
  labels: LabelDefinitionInput[];
}

export type ImportMode = "append" | "replace";

export interface ImportResult {
  mode: ImportMode;
  nodes_created: number;
  relationships_created: number;
  labels_saved: number;
  /** Solo en el import Cypher. */
  statements_total?: number | null;
  statements_executed?: number | null;
  error: { code: string; message: string; line?: number | null; statement?: number } | null;
}

export interface CypherPreview {
  statements: number;
  definitions: string[];
  uses_sid: boolean;
}
