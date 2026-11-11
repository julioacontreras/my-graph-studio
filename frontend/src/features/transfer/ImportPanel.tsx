import { Upload } from "lucide-react";
import { useState } from "react";
import { importCypher, importGraph, previewCypher } from "../../api/transfer";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorBox } from "../../components/ErrorBox";
import { useLabels } from "../../state/LabelsContext";
import { useSession } from "../../state/SessionContext";
import type { CypherPreview, ImportMode, ImportResult } from "../../types/transfer";
import { validateImport, type ImportCheck } from "./validateImport";

type Source = { kind: "json"; check: ImportCheck } | { kind: "cypher"; script: string; preview: CypherPreview };

const isCypherFile = (name: string) => /\.(cypher|cql|cyp)$/i.test(name);

export function ImportPanel() {
  const { scope } = useSession();
  const { byLabel, reload } = useLabels();
  const [source, setSource] = useState<Source | null>(null);
  const [mode, setMode] = useState<ImportMode>("append");
  const [confirm, setConfirm] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function onFile(file: File | undefined) {
    setResult(null);
    setError(null);
    setSource(null);
    if (!file) return;
    const text = await file.text();
    if (isCypherFile(file.name)) {
      try {
        setSource({
          kind: "cypher",
          script: text,
          preview: await previewCypher(text),
        });
      } catch (e) {
        setError(e);
      }
      return;
    }
    try {
      setSource({ kind: "json", check: validateImport(JSON.parse(text)) });
    } catch {
      setSource({
        kind: "json",
        check: {
          ok: false,
          errors: ["El fichero no es JSON válido. Para un script Cypher usa la extensión .cypher."],
        },
      });
    }
  }

  async function run() {
    if (!ready || !source) return;
    setConfirm(false);
    setRunning(true);
    try {
      setResult(
        source.kind === "cypher"
          ? await importCypher(scope, source.script, mode)
          : source.check.ok
            ? await importGraph(scope, source.check.dump, mode)
            : null,
      );
      setError(null);
      await reload();
    } catch (e) {
      setError(e);
    } finally {
      setRunning(false);
    }
  }

  const check = source?.kind === "json" ? source.check : null;
  const preview = source?.kind === "cypher" ? source.preview : null;
  const ready = Boolean(check?.ok || (preview && preview.statements > 0));
  const newLabels = check?.ok ? check.summary.labels.filter((l) => !byLabel.has(l)) : [];

  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">Importar</h2>
      <p className="text-sm text-muted">
        Un export JSON del Studio o un script Cypher (<span className="font-mono">.cypher</span>), como el que genera el export.
      </p>
      <input
        type="file"
        accept="application/json,.json,.cypher,.cql,.cyp"
        onChange={(e) => void onFile(e.target.files?.[0])}
        className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-line file:bg-elevated file:px-3 file:py-1.5 file:text-fg"
      />

      {check && !check.ok && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-danger">
          {check.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {preview && preview.statements === 0 && <p className="text-sm text-danger">El script no tiene sentencias.</p>}

      {preview && preview.statements > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted">Sentencias</dt>
          <dd className="font-mono">{preview.statements}</dd>
          <dt className="text-muted">Definiciones en el fichero</dt>
          <dd className="font-mono">{preview.definitions.join(", ") || "ninguna"}</dd>
        </dl>
      )}

      {check?.ok && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted">Nodos</dt>
          <dd className="font-mono">{check.summary.nodes}</dd>
          <dt className="text-muted">Relaciones</dt>
          <dd className="font-mono">{check.summary.relationships}</dd>
          <dt className="text-muted">Etiquetas</dt>
          <dd className="font-mono">{check.summary.labels.join(", ") || "ninguna"}</dd>
          <dt className="text-muted">Etiquetas sin definición aquí</dt>
          <dd className="font-mono">{newLabels.join(", ") || "ninguna"}</dd>
          <dt className="text-muted">Definiciones en el fichero</dt>
          <dd className="font-mono">{check.summary.definitions}</dd>
        </dl>
      )}

      {ready && (
        <>
          <fieldset className="space-y-1 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "append"} onChange={() => setMode("append")} />
              Añadir a lo que ya hay
            </label>
            <label className="flex items-center gap-2 text-danger">
              <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} />
              Sobrescribir: borra todos los nodos de {scope.database}/{scope.schema} antes
            </label>
          </fieldset>

          <Button variant={mode === "replace" ? "danger" : "primary"} disabled={running} onClick={() => setConfirm(true)}>
            <Upload size={14} /> {running ? "Importando…" : "Importar"}
          </Button>
        </>
      )}

      <ErrorBox error={error} />
      {result && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${result.error ? "border-warn/40 text-warn" : "border-ok/40 text-ok"}`}
        >
          {result.nodes_created} nodos y {result.relationships_created} relaciones importados, {result.labels_saved} definiciones
          guardadas.
          {result.statements_total != null && (
            <>
              {" "}
              {result.statements_executed} de {result.statements_total} sentencias ejecutadas.
            </>
          )}
          {result.error && (
            <p className="mt-1">
              {result.error.statement != null
                ? `Falló la sentencia ${result.error.statement}${result.error.line ? ` (línea ${result.error.line})` : ""}`
                : "Un lote falló"}{" "}
              ({result.error.code}: {result.error.message}). Lo anterior ya está importado.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        title={mode === "replace" ? "Sobrescribir el grafo" : "Importar"}
        confirmLabel={mode === "replace" ? "Sobrescribir" : "Importar"}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void run()}
      >
        {mode === "replace"
          ? `Se borran todos los nodos y relaciones de ${scope.database}/${scope.schema} y se importa el fichero. No se puede deshacer.`
          : source?.kind === "cypher"
            ? "Se ejecuta el script sentencia a sentencia. Si una falla, lo anterior queda ejecutado."
            : "Se añaden los nodos y relaciones del fichero. Se importa en lotes: si uno falla, lo anterior queda importado."}
      </ConfirmDialog>
    </section>
  );
}
