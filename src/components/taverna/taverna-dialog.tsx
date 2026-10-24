import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type TavernaDialogProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function TavernaDialog({ title, onClose, children }: TavernaDialogProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-panel bg-popover flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border px-6 py-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
