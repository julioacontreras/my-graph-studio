export type PropertyValue = string | number | boolean | null | PropertyValue[] | { [key: string]: PropertyValue };
export type Properties = Record<string, PropertyValue>;

export interface GraphNode {
  id: number;
  labels: string[];
  properties: Properties;
}

export interface GraphRelationship {
  id: number;
  type: string;
  start: number;
  end: number;
  properties: Properties;
}

export interface GraphPath {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface Graph {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface Stats {
  nodes_created: number;
  nodes_deleted: number;
  relationships_created: number;
  relationships_deleted: number;
  properties_set: number;
  labels_added: number;
  labels_removed: number;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  stats: Stats;
  graph: Graph;
  database: string;
  schema: string;
  elapsed_ms: number;
}

export interface Scope {
  database: string;
  schema: string;
}
