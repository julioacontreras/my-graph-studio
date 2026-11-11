import type { GraphRelationship, Properties, Scope } from "../types/graph";
import { request } from "./client";

export const createRelationship = (scope: Scope, start: number, end: number, type: string, properties: Properties = {}) =>
  request<GraphRelationship>("POST", "/relationships", { scope, body: { start, end, type, properties } });

export const updateRelationship = (scope: Scope, id: number, properties: Properties) =>
  request<GraphRelationship>("PATCH", `/relationships/${id}`, { scope, body: { properties } });

export const deleteRelationship = (scope: Scope, id: number) =>
  request<void>("DELETE", `/relationships/${id}`, { scope });
