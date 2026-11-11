import { Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { createLabel, deleteLabel, updateLabel } from "../../api/labels";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorBox } from "../../components/ErrorBox";
import { useLabels } from "../../state/LabelsContext";
import { useSession } from "../../state/SessionContext";
import type { LabelDefinitionInput } from "../../types/labels";
import { DetectFromData } from "./DetectFromData";
import { emptyDefinition, LabelForm } from "./LabelForm";
import { LabelList } from "./LabelList";
import { PALETTE } from "./palette";
import { ViolationsPanel } from "./ViolationsPanel";

type Editing = { kind: "new"; draft: LabelDefinitionInput } | { kind: "existing"; label: string } | null;

export function LabelDesignerPage() {
  const { scope } = useSession();
  const { definitions, byLabel, reload, error: loadError } = useLabels();
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [detectOpen, setDetectOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropIndexes, setDropIndexes] = useState(false);

  const current = editing?.kind === "existing" ? byLabel.get(editing.label) : undefined;
  const initial = useMemo(
    () => (editing?.kind === "new" ? editing.draft : current ? { ...current } : null),
    [editing, current],
  );

  async function save(d: LabelDefinitionInput) {
    setSaving(true);
    try {
      if (editing?.kind === "new") await createLabel(scope, d);
      else await updateLabel(scope, d);
      await reload();
      setEditing({ kind: "existing", label: d.label });
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (editing?.kind !== "existing") return;
    setConfirmDelete(false);
    try {
      await deleteLabel(scope, editing.label, dropIndexes);
      await reload();
      setEditing(null);
    } catch (e) {
      setError(e);
    }
  }

  const newDraft = () =>
    setEditing({ kind: "new", draft: emptyDefinition(PALETTE[definitions.length % PALETTE.length]) });

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex gap-2 border-b border-line p-3">
          <Button variant="primary" onClick={newDraft}>
            <Plus size={14} /> Nueva
          </Button>
          <Button onClick={() => setDetectOpen(true)}>
            <Sparkles size={14} /> Detectar
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          <ErrorBox error={loadError ? new Error(loadError) : null} />
          <LabelList
            definitions={definitions}
            selected={editing?.kind === "existing" ? editing.label : null}
            onSelect={(label) => {
              setError(null);
              setEditing({ kind: "existing", label });
            }}
          />
        </div>
      </aside>

      <div className="flex-1 overflow-auto p-6">
        {!initial ? (
          <div className="max-w-xl space-y-2 text-sm text-muted">
            <h1 className="text-xl font-semibold text-fg">Label Designer</h1>
            <p>
              Define color, descripción y propiedades con tipo para cada etiqueta de {scope.database}/{scope.schema}. Las
              definiciones las guarda el Studio: MyGraph no tiene este concepto.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            <h1 className="text-xl font-semibold">{editing?.kind === "new" ? "Nueva definición" : initial.label}</h1>
            <ErrorBox error={error} />
            <LabelForm
              initial={initial}
              isNew={editing?.kind === "new"}
              saving={saving}
              onSave={(d) => void save(d)}
              onDelete={editing?.kind === "existing" ? () => setConfirmDelete(true) : undefined}
            />
            {editing?.kind === "existing" && <ViolationsPanel label={editing.label} />}
          </div>
        )}
      </div>

      <DetectFromData
        open={detectOpen}
        onClose={() => setDetectOpen(false)}
        onUse={(d) => {
          setDetectOpen(false);
          setEditing({ kind: "new", draft: d });
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Borrar definición"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      >
        <p>Se borra la definición de {editing?.kind === "existing" ? editing.label : ""}. Los nodos no se borran.</p>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={dropIndexes} onChange={(e) => setDropIndexes(e.target.checked)} />
          Borrar también los índices de las propiedades unique/indexed
        </label>
      </ConfirmDialog>
    </div>
  );
}
