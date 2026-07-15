import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { CHARACTER_TAB_BLOCK_TYPE_LABELS } from "@/services/character-tab-block-service";
import type { AppliedBatch } from "@/services/note-suggestions";
import { cn } from "@/utils/cn";

/** Lista dos blocos aplicados por um lote de sugestões da IA (Davena, entrevista ou import),
 * com botão de desfazer individual por item — compartilhada pelas três telas. */
export function AppliedResultsList({
  batch,
  onUndoItem,
  undoingIndex,
  disabled,
}: {
  batch: AppliedBatch;
  onUndoItem: (index: number) => void;
  /** Índice do item sendo desfeito agora (mostra o spinner na linha certa), ou null. */
  undoingIndex: number | null;
  disabled: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {batch.items.map((item, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          {item.undone ? (
            <Undo2 className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="text-primary mt-0.5 size-3.5 shrink-0" />
          )}
          <span className={cn("flex-1", item.undone && "text-muted-foreground line-through")}>
            <strong>{item.mode === "update" ? "Atualizado" : "Criado"}</strong> em {item.tabName}
            {item.title ? ` · ${item.title}` : ""}
            <span className="text-muted-foreground"> ({CHARACTER_TAB_BLOCK_TYPE_LABELS[item.type]})</span>
          </span>
          {!item.undone && (
            <button
              type="button"
              onClick={() => onUndoItem(index)}
              disabled={disabled}
              title="Desfazer só este item"
              className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {undoingIndex === index ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Undo2 className="size-3.5" />
              )}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
