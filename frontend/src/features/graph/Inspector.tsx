import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteNode, updateNode } from "../../api/nodes";
import { deleteRelationship, updateRelationship } from "../../api/relationships";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorBox } from "../../components/ErrorBox";
import { textOn } from "../../lib/contrast";
import { useLabels } from "../../state/LabelsContext";
import { useSession } from "../../state/SessionContext";
import type { Graph, Properties } from "../../types/graph";
import { removeFromGraph, replaceNode, replaceRelationship } from "./extractGraph";
import type { Selection } from "./GraphView";
import { PropertyEditor } from "./PropertyEditor";

export function Inspector({
  graph,
  selection,
  setGraph,
  onClose,
}: {
  graph: Graph;
  selection: NonNullable<Selection>;
  setGraph: (update: (g: Graph) => Graph) => void;
  onClose: () => void;
}) {
  const { scope } = useSession();
  const { colorFor, reload } = useLabels();
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const node = selection.kind === "node" ? graph.nodes.find((n) => n.id === selection.id) : undefined;
  const rel = selection.kind === "relationship" ? graph.relationships.find((r) => r.id === selection.id) : undefined;
  if (!node && !rel) return null;

  async function run(action: () => Promise<void>) {
    setSaving(true);
    try {
      await action();
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  const saveProps = (properties: Properties) =>
    run(async () => {
      if (node) {
        const updated = await updateNode(scope, node.id, { properties });
        setGraph((g) => replaceNode(g, updated));
      } else if (rel) {
        const updated = await updateRelationship(scope, rel.id, properties);
        setGraph((g) => replaceRelationship(g, updated));
      }
    });

  const changeLabels = (add: string[], remove: string[]) =>
    run(async () => {
      const updated = await updateNode(scope, node!.id, { add_labels: add, remove_labels: remove });
      setGraph((g) => replaceNode(g, updated));
      void reload(); // el número de nodos por etiqueta cambia
    });

  const remove = () =>
    run(async () => {
      setConfirm(false);
      if (node) await deleteNode(scope, node.id);
      else await deleteRelationship(scope, rel!.id);
      setGraph((g) => removeFromGraph(g, selection.kind, selection.id));
      onClose();
    });

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold">
          {node ? "Nodo" : "Relación"} <span className="font-mono text-muted">#{selection.id}</span>
        </h2>
        <button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Cerrar">
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-auto p-4">
        {node && (
          <section className="space-y-2">
            <h3 className="label-text">Etiquetas</h3>
            <div className="flex flex-wrap gap-1.5">
              {node.labels.map((l) => {
                const c = colorFor([l]);
                return (
                  <span key={l} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs" style={{ background: c, color: textOn(c) }}>
                    {l}
                    <button type="button" aria-label={`Quitar ${l}`} onClick={() => changeLabels([], [l])}>
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (newLabel.trim()) void changeLabels([newLabel.trim()], []).then(() => setNewLabel(""));
              }}
            >
              <input className="input" placeholder="Añadir etiqueta" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            </form>
          </section>
        )}

        {rel && (
          <section className="space-y-1 font-mono text-xs text-muted">
            <p>
              <span className="text-fg">#{rel.start}</span> -[:<span className="text-fg">{rel.type}</span>]-&gt;{" "}
              <span className="text-fg">#{rel.end}</span>
            </p>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="label-text">Propiedades</h3>
          <PropertyEditor properties={(node ?? rel)!.properties} onSave={saveProps} saving={saving} />
        </section>

        <ErrorBox error={error} />
      </div>

      <footer className="border-t border-line p-4">
        <Button variant="danger" onClick={() => setConfirm(true)} disabled={saving}>
          <Trash2 size={14} /> Borrar {node ? "nodo" : "relación"}
        </Button>
      </footer>

      <ConfirmDialog
        open={confirm}
        title={node ? "Borrar nodo" : "Borrar relación"}
        onCancel={() => setConfirm(false)}
        onConfirm={() => void remove()}
      >
        {node
          ? "Se borra el nodo y todas sus relaciones (DETACH DELETE). No se puede deshacer."
          : "Se borra la relación. No se puede deshacer."}
      </ConfirmDialog>
    </aside>
  );
}
