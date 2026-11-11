import type { Scope } from "../types/graph";
import type { DetectedLabel, LabelDefinition, LabelDefinitionInput, Violation } from "../types/labels";
import { request } from "./client";

const path = (label: string) => `/labels/${encodeURIComponent(label)}`;

export const listLabels = (scope: Scope) => request<LabelDefinition[]>("GET", "/labels", { scope });
export const createLabel = (scope: Scope, d: LabelDefinitionInput) =>
  request<LabelDefinition>("POST", "/labels", { scope, body: d });
export const updateLabel = (scope: Scope, d: LabelDefinitionInput) =>
  request<LabelDefinition>("PUT", path(d.label), { scope, body: d });
export const deleteLabel = (scope: Scope, label: string, dropIndexes = false) =>
  request<void>("DELETE", path(label), { scope, query: { drop_indexes: dropIndexes } });
export const getViolations = (scope: Scope, label: string) =>
  request<Violation[]>("GET", `${path(label)}/violations`, { scope });
export const detectLabels = (scope: Scope, sample = 500) =>
  request<DetectedLabel[]>("GET", "/labels/detect", { scope, query: { sample } });
export const listIndexes = (scope: Scope) =>
  request<{ name: string; label: string; property: string; entries: number }[]>("GET", "/indexes", { scope });
