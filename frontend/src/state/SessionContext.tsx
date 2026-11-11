import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Scope } from "../types/graph";

interface Session {
  scope: Scope;
  setScope: (scope: Scope) => void;
  /** Cambia cada vez que se crean o borran bases de datos o schemas. */
  databasesVersion: number;
  refreshDatabases: () => void;
}

const KEY = "mygraph-studio.scope";
const SessionContext = createContext<Session | null>(null);

function load(): Scope {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (typeof s?.database === "string" && typeof s?.schema === "string") return s;
  } catch {
    /* primera visita */
  }
  return { database: "default", schema: "public" };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<Scope>(load);
  const [databasesVersion, setDatabasesVersion] = useState(0);
  const refreshDatabases = useCallback(() => setDatabasesVersion((v) => v + 1), []);
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(scope)), [scope]);
  const value = useMemo(
    () => ({ scope, setScope, databasesVersion, refreshDatabases }),
    [scope, databasesVersion, refreshDatabases],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
