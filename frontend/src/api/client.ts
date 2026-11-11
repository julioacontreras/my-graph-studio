import type { Scope } from "../types/graph";
import { ApiError, type ApiErrorBody } from "../types/errors";

const BASE = "/api/v1";

type Query = Record<string, string | number | boolean | undefined>;

export function url(path: string, scope?: Scope, query: Query = {}): string {
  const params = new URLSearchParams();
  if (scope) {
    params.set("database", scope.database);
    params.set("schema", scope.schema);
  }
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, String(v));
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ""}`;
}

export async function request<T>(
  method: string,
  path: string,
  opts: { scope?: Scope; query?: Query; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path, opts.scope, opts.query), {
      method,
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError(0, { code: "Unavailable", message: "The gateway is not reachable." });
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const body: ApiErrorBody =
      data && typeof data.code === "string"
        ? data
        : { code: res.status === 422 ? "Validation" : "Http", message: data?.detail?.[0]?.msg ?? res.statusText };
    throw new ApiError(res.status, body);
  }
  return data as T;
}
