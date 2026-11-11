import { Download } from "lucide-react";
import { exportUrl } from "../../api/transfer";
import { useSession } from "../../state/SessionContext";

export function ExportPanel() {
  const { scope } = useSession();
  const link = "inline-flex items-center gap-1.5 rounded-md border border-line bg-elevated px-3 py-1.5 text-sm font-medium hover:border-muted";
  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">Exportar</h2>
      <p className="text-sm text-muted">
        Exporta todos los nodos y relaciones de {scope.database}/{scope.schema}, los índices y las definiciones de etiqueta.
      </p>
      <div className="flex gap-2">
        <a className={link} href={exportUrl(scope, "json")} download>
          <Download size={14} /> JSON
        </a>
        <a className={link} href={exportUrl(scope, "cypher")} download>
          <Download size={14} /> Script Cypher
        </a>
      </div>
      <p className="text-xs text-muted">
        El script Cypher lleva los valores literales (la CLI no acepta parámetros) y usa una propiedad temporal _sid para unir
        las relaciones, porque MyGraph asigna los ids y no tiene MERGE.
      </p>
    </section>
  );
}
