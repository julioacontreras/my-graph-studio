import { useEffect, useState } from "react";
import { listDatabases, listSchemas } from "../../api/databases";
import { useSession } from "../../state/SessionContext";
import { Select } from "../Select";

export function ScopeSelector() {
  const { scope, setScope } = useSession();
  const [databases, setDatabases] = useState<string[]>([scope.database]);
  const [schemas, setSchemas] = useState<string[]>([scope.schema]);

  useEffect(() => {
    listDatabases()
      .then((d) => setDatabases(d.map((x) => x.name)))
      .catch(() => setDatabases([scope.database]));
  }, []);

  useEffect(() => {
    listSchemas(scope.database)
      .then((s) => setSchemas(s.map((x) => x.name)))
      .catch(() => setSchemas([scope.schema]));
  }, [scope.database, scope.schema]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Select
        aria-label="Base de datos"
        value={scope.database}
        onChange={(e) => setScope({ database: e.target.value, schema: "public" })}
        options={databases.map((d) => ({ value: d }))}
      />
      <span className="text-muted">/</span>
      <Select
        aria-label="Schema"
        value={scope.schema}
        onChange={(e) => setScope({ ...scope, schema: e.target.value })}
        options={schemas.map((s) => ({ value: s }))}
      />
    </div>
  );
}
