import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import type { LinkableBlock } from "@/hooks/use-linkable-blocks";
import { cn } from "@/utils/cn";

export function MentionDropdown({
  position,
  options,
  activeIndex,
  isLoading,
  onSelect,
  onHoverIndex,
}: {
  position: { top: number; left: number } | null;
  options: LinkableBlock[];
  activeIndex: number;
  isLoading: boolean;
  onSelect: (block: LinkableBlock) => void;
  onHoverIndex: (index: number) => void;
}) {
  if (!position) return null;

  return createPortal(
    <div
      className="border-border/60 bg-popover fixed z-50 w-64 border shadow-xl"
      style={{ top: position.top, left: position.left }}
    >
      <div className="max-h-56 overflow-y-auto py-1">
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
            <Loader2 className="size-3.5 animate-spin" />
            Carregando...
          </div>
        ) : options.length === 0 ? (
          <p className="text-muted-foreground px-3 py-3 text-xs italic">
            Nenhum bloco com título encontrado.
          </p>
        ) : (
          options.map((block, index) => (
            <button
              key={block.id}
              type="button"
              onMouseEnter={() => onHoverIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(block);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                index === activeIndex ? "bg-accent/10" : "hover:bg-accent/10",
              )}
            >
              <span className="truncate">{block.title}</span>
              <span className="dossier-meta shrink-0 text-[10px]">{block.tabName}</span>
            </button>
          ))
        )}
      </div>
    </div>,
    document.body,
  );
}
