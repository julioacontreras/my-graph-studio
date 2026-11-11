import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

/** Confirmación para acciones destructivas (botón en `danger`). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Borrar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
