import type { QueryResult, Scope } from "../types/graph";
import { request } from "./client";

export const executeCypher = (scope: Scope, query: string, params: Record<string, unknown> = {}) =>
  request<QueryResult>("POST", "/cypher/execute", { scope, body: { query, params } });
