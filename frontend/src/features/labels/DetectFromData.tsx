import { useEffect, useState } from "react";
import { detectLabels } from "../../api/labels";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { ErrorBox } from "../../components/ErrorBox";
import { textOn } from "../../lib/contrast";
import { useSession } from "../../state/SessionContext";
import type { DetectedLabel, LabelDefinitionInput } from "../../types/labels";

/** Propone definiciones a partir de una muestra de nodos. No guarda nada hasta que se elige una. */
export function DetectFromData({
  open,
  onClose,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  onUse: (d: LabelDefinitionInput) => void;
}) {
  const { scope } = useSession();
  const [items, setItems] = useState<DetectedLabel[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    detectLabels(scope)
      .then(setItems)
      .catch(setError);
  }, [open, scope]);

  return (
    <Dialog open={open} title="Detectar desde datos" onClose={onClose} wide>
      <ErrorBox error={error} />
      {!items && !error && <p className="text-muted">Analizando una muestra de 500 nodos…</p>}
      {items && items.length === 0 && <p className="text-muted">No hay nodos con etiqueta.</p>}
      {items && (
        <ul className="space-y-3">
          {items.map(({ sampled, exists, ...d }) => (
            <li key={d.label} className="rounded-md border border-line p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: d.color, color: textOn(d.color) }}>
                    {d.label}
                  </span>
                  <span className="text-xs text-muted">{sampled} nodos en la muestra</span>
                </div>
                {exists ? (
                  <span className="text-xs text-muted">Ya definida</span>
                ) : (
                  <Button variant="primary" onClick={() => onUse(d)}>
                    Usar
                  </Button>
                )}
              </div>
              <p className="mt-2 font-mono text-xs text-muted">
                {d.properties.map((p) => `${p.name}: ${p.type}${p.required ? "!" : ""}`).join(", ") || "sin propiedades"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
