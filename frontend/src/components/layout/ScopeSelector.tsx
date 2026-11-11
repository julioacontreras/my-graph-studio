import { useEffect, useState } from "react";
import { listDatabases, listSchemas } from "../../api/databases";
import { useSession } from "../../state/SessionContext";
import { Select } from "../Select";

export function ScopeSelector() {
  const { scope, setScope, databasesVersion } = useSession();
  const [databases, setDatabases] = useState<string[]>([scope.database]);
  const [schemas, setSchemas] = useState<string[]>([scope.schema]);

  useEffect(() => {
    listDatabases()
      .then((d) => {
        const names = d.map((x) => x.name);
        setDatabases(names);
        // La base guardada ya no existe (p. ej. tras un DROP DATABASE).
        if (names.length && !names.includes(scope.database)) {
          setScope({ database: names.includes("default") ? "default" : names[0], schema: "public" });
        }
      })
      .catch(() => setDatabases([scope.database]));
    // `scope.database` solo se lee para validar; recargar al cambiarlo no hace falta.
  }, [databasesVersion]);

  useEffect(() => {
    listSchemas(scope.database)
      .then((s) => setSchemas(s.map((x) => x.name)))
      .catch(() => setSchemas([scope.schema]));
  }, [scope.database, scope.schema, databasesVersion]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">Base de datos</span>
      <Select
        aria-label="Base de datos"
        value={scope.database}
        onChange={(e) => setScope({ database: e.target.value, schema: "public" })}
        options={databases.map((d) => ({ value: d }))}
      />
      <span className="text-muted">Schema</span>
      <Select
        aria-label="Schema"
        value={scope.schema}
        onChange={(e) => setScope({ ...scope, schema: e.target.value })}
        options={schemas.map((s) => ({ value: s }))}
      />
    </div>
  );
}
