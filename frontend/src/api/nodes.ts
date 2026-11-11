import type { Graph, GraphNode, Properties, Scope } from "../types/graph";
import { request } from "./client";

export const createNode = (scope: Scope, labels: string[], properties: Properties) =>
  request<GraphNode>("POST", "/nodes", { scope, body: { labels, properties } });

export const updateNode = (
  scope: Scope,
  id: number,
  change: { properties?: Properties; add_labels?: string[]; remove_labels?: string[] },
) => request<GraphNode>("PATCH", `/nodes/${id}`, { scope, body: change });

export const deleteNode = (scope: Scope, id: number) => request<void>("DELETE", `/nodes/${id}`, { scope });

export const getNeighbors = (scope: Scope, id: number, limit = 100) =>
  request<Graph>("GET", `/nodes/${id}/neighbors`, { scope, query: { limit } });
