import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={`m-auto w-full ${wide ? "max-w-3xl" : "max-w-md"} rounded-lg border border-line bg-surface p-0 text-fg backdrop:bg-black/60`}
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Cerrar">
          <X size={16} />
        </button>
      </header>
      <div className="max-h-[70vh] overflow-auto px-4 py-4 text-sm">{children}</div>
      {footer && <footer className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</footer>}
    </dialog>
  );
}
