import { ArrowLeftRight, Tags, Terminal, type LucideIcon } from "lucide-react";

export type ModuleId = "cypher" | "labels" | "transfer";

const MODULES: { id: ModuleId; label: string; icon: LucideIcon }[] = [
  { id: "cypher", label: "Cypher & Graph", icon: Terminal },
  { id: "labels", label: "Label Designer", icon: Tags },
  { id: "transfer", label: "Import / Export", icon: ArrowLeftRight },
];

export function Sidebar({ active, onChange }: { active: ModuleId; onChange: (id: ModuleId) => void }) {
  return (
    <nav className="flex w-14 flex-col items-center gap-1 border-r border-line bg-surface py-3">
      {MODULES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={label}
          aria-label={label}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onChange(id)}
          className={`flex h-10 w-10 items-center justify-center rounded-md ${
            active === id ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg"
          }`}
        >
          <Icon size={18} />
        </button>
      ))}
    </nav>
  );
}
