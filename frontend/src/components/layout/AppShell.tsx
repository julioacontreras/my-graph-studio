import type { ReactNode } from "react";
import { ScopeSelector } from "./ScopeSelector";
import { Sidebar, type ModuleId } from "./Sidebar";

export function AppShell({
  active,
  onChange,
  children,
}: {
  active: ModuleId;
  onChange: (id: ModuleId) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-surface px-4">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          <span className="font-display text-base font-semibold">
            MyGraph <span className="text-muted">Studio</span>
          </span>
        </div>
        <ScopeSelector />
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar active={active} onChange={onChange} />
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
