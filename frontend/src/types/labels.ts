export const PROPERTY_TYPES = ["String", "Integer", "Float", "Boolean", "Date"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface PropertyDefinition {
  name: string;
  type: PropertyType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
}

export interface LabelDefinitionInput {
  label: string;
  color: string;
  description: string;
  properties: PropertyDefinition[];
}

export interface LabelDefinition extends LabelDefinitionInput {
  database: string;
  schema: string;
  count?: number;
}

export interface DetectedLabel extends LabelDefinitionInput {
  sampled: number;
  exists: boolean;
}

export interface Violation {
  node_id: number | null;
  label: string;
  property: string;
  rule: "required" | "unique" | "type";
  message: string;
}
