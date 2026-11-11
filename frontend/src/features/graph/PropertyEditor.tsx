import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { parseValue, stringifyValue } from "../../lib/format";
import type { Properties } from "../../types/graph";

interface Row {
  key: string;
  value: string;
}

const toRows = (p: Properties): Row[] => Object.entries(p).map(([key, v]) => ({ key, value: stringifyValue(v) }));

/**
 * Edita propiedades. Los valores se leen como JSON (`42`, `true`, `[1,2]`);
 * lo que no es JSON válido se guarda como texto.
 */
export function PropertyEditor({
  properties,
  onSave,
  saving,
}: {
  properties: Properties;
  onSave: (changes: Properties) => void;
  saving: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(properties));
  useEffect(() => setRows(toRows(properties)), [properties]);

  function save() {
    const next: Properties = {};
    for (const r of rows) if (r.key.trim()) next[r.key.trim()] = parseValue(r.value) as Properties[string];
    // Las claves que desaparecen se envían como null: `SET n += $props` las borra.
    for (const k of Object.keys(properties)) if (!(k in next)) next[k] = null;
    onSave(next);
  }

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-1.5">
          <input className="input w-2/5 font-mono" value={r.key} placeholder="clave" onChange={(e) => set(i, { key: e.target.value })} />
          <input className="input font-mono" value={r.value} placeholder="valor" onChange={(e) => set(i, { value: e.target.value })} />
          <button
            type="button"
            aria-label="Quitar propiedad"
            className="text-muted hover:text-danger"
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="flex justify-between">
        <button type="button" className="flex items-center gap-1 text-xs text-link" onClick={() => setRows([...rows, { key: "", value: "" }])}>
          <Plus size={12} /> Propiedad
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
