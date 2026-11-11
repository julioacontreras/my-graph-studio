import { ChevronDown, FileCode2 } from "lucide-react";
import { SNIPPET_GROUPS } from "./snippets";

/**
 * Selector de plantillas Cypher, agrupadas por tarea. Elegir una escribe la
 * consulta en el editor (no la ejecuta) y el selector vuelve a su texto inicial,
 * así se puede elegir la misma plantilla otra vez.
 */
export function TemplateSelect({ onPick }: { onPick: (query: string) => void }) {
  return (
    <label className="group relative inline-flex items-center">
      <FileCode2 size={14} className="pointer-events-none absolute left-2.5 text-muted group-hover:text-fg" />
      <select
        aria-label="Insertar plantilla Cypher"
        value=""
        onChange={(e) => {
          const [g, s] = e.target.value.split(":").map(Number);
          const snippet = SNIPPET_GROUPS[g]?.snippets[s];
          if (snippet) onPick(snippet.query);
        }}
        className="cursor-pointer appearance-none rounded-md border border-line bg-elevated py-1 pl-8 pr-7 text-xs text-fg transition-colors hover:border-muted focus:border-link focus:outline-none"
      >
        <option value="" disabled hidden>
          Plantillas
        </option>
        {SNIPPET_GROUPS.map((g, gi) => (
          <optgroup key={g.title} label={g.title}>
            {g.snippets.map((s, si) => (
              <option key={s.label} value={`${gi}:${si}`}>
                {s.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 text-muted" />
    </label>
  );
}
