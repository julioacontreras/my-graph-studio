import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { contrastRatio, textOn } from "../../lib/contrast";
import { PROPERTY_TYPES, type LabelDefinitionInput, type PropertyDefinition } from "../../types/labels";
import { PALETTE } from "./palette";

export const emptyDefinition = (color = PALETTE[0]): LabelDefinitionInput => ({
  label: "",
  color,
  description: "",
  properties: [],
});

const emptyProperty = (): PropertyDefinition => ({
  name: "",
  type: "String",
  required: false,
  unique: false,
  indexed: false,
});

export function LabelForm({
  initial,
  isNew,
  saving,
  onSave,
  onDelete,
}: {
  initial: LabelDefinitionInput;
  isNew: boolean;
  saving: boolean;
  onSave: (d: LabelDefinitionInput) => void;
  onDelete?: () => void;
}) {
  const [d, setD] = useState(initial);
  useEffect(() => setD(initial), [initial]);

  const setProp = (i: number, patch: Partial<PropertyDefinition>) =>
    setD({ ...d, properties: d.properties.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  const lowContrast = contrastRatio(d.color, textOn(d.color)) < 4.5;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...d, properties: d.properties.filter((p) => p.name.trim()) });
      }}
    >
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <label className="space-y-1">
          <span className="label-text">Etiqueta</span>
          <input
            className="input font-mono"
            value={d.label}
            disabled={!isNew}
            required
            placeholder="Person"
            onChange={(e) => setD({ ...d, label: e.target.value })}
          />
        </label>
        <div className="space-y-1">
          <span className="label-text">Color</span>
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setD({ ...d, color: c })}
                className={`h-6 w-6 rounded-full ${d.color === c ? "ring-2 ring-fg ring-offset-2 ring-offset-surface" : ""}`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Otro color"
              value={d.color}
              onChange={(e) => setD({ ...d, color: e.target.value })}
              className="h-6 w-8 cursor-pointer bg-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: d.color, color: textOn(d.color) }}
        >
          {d.label || "Vista previa"}
        </span>
        {lowContrast && <span className="text-xs text-warn">El texto de la etiqueta tiene poco contraste sobre este color.</span>}
      </div>

      <label className="block space-y-1">
        <span className="label-text">Descripción</span>
        <textarea
          className="input min-h-16"
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
        />
      </label>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="label-text">Propiedades</h3>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-link"
            onClick={() => setD({ ...d, properties: [...d.properties, emptyProperty()] })}
          >
            <Plus size={12} /> Propiedad
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1 font-medium">Nombre</th>
              <th className="py-1 font-medium">Tipo</th>
              <th className="py-1 text-center font-medium" title="El gateway rechaza escrituras sin este valor">required</th>
              <th className="py-1 text-center font-medium" title="El gateway comprueba que no se repite; crea un índice">unique</th>
              <th className="py-1 text-center font-medium" title="Crea un índice de igualdad en MyGraph">indexed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {d.properties.map((p, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <input className="input font-mono" value={p.name} onChange={(e) => setProp(i, { name: e.target.value })} />
                </td>
                <td className="py-1 pr-2">
                  <Select
                    value={p.type}
                    onChange={(e) => setProp(i, { type: e.target.value as PropertyDefinition["type"] })}
                    options={PROPERTY_TYPES.map((t) => ({ value: t }))}
                  />
                </td>
                {(["required", "unique", "indexed"] as const).map((k) => (
                  <td key={k} className="py-1 text-center">
                    <input
                      type="checkbox"
                      checked={p[k] || (k === "indexed" && p.unique)}
                      disabled={k === "indexed" && p.unique}
                      onChange={(e) => setProp(i, { [k]: e.target.checked })}
                    />
                  </td>
                ))}
                <td className="py-1 text-right">
                  <button
                    type="button"
                    aria-label="Quitar propiedad"
                    className="text-muted hover:text-danger"
                    onClick={() => setD({ ...d, properties: d.properties.filter((_, j) => j !== i) })}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted">
          MyGraph no tiene constraints: required y unique solo se comprueban en las escrituras hechas desde el Studio. Date se
          guarda como texto ISO-8601 (2023-01-15).
        </p>
      </section>

      <div className="flex justify-between">
        {onDelete ? (
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={14} /> Borrar definición
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" disabled={saving || !d.label.trim()}>
          {isNew ? "Crear" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
