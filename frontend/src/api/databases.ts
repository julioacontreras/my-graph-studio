import { request } from "./client";

export interface DatabaseInfo {
  name: string;
  [key: string]: unknown;
}
export interface SchemaInfo {
  name: string;
  [key: string]: unknown;
}

export const listDatabases = () => request<DatabaseInfo[]>("GET", "/databases");
export const listSchemas = (database: string) =>
  request<SchemaInfo[]>("GET", `/databases/${encodeURIComponent(database)}/schemas`);
