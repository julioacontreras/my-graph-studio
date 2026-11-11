import { textOn } from "../../lib/contrast";
import type { LabelDefinition } from "../../types/labels";

export function LabelList({
  definitions,
  selected,
  onSelect,
}: {
  definitions: LabelDefinition[];
  selected: string | null;
  onSelect: (label: string) => void;
}) {
  if (definitions.length === 0) {
    return <p className="p-4 text-sm text-muted">No hay definiciones en esta base de datos y schema.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {definitions.map((d) => (
        <li key={d.label}>
          <button
            type="button"
            onClick={() => onSelect(d.label)}
            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${
              selected === d.label ? "bg-elevated" : "hover:bg-elevated/60"
            }`}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{ background: d.color, color: textOn(d.color) }}
            >
              {d.label.slice(0, 1)}
            </span>
            <span className="flex-1 truncate">{d.label}</span>
            <span className="font-mono text-xs text-muted">{d.count ?? 0}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
