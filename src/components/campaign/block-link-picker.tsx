import { useEffect, useRef, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { useLinkableBlocks, type LinkableBlock } from "@/hooks/use-linkable-blocks";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

export function BlockLinkPicker({
  characterId,
  excludeBlockId,
  onInsert,
}: {
  characterId: string;
  excludeBlockId?: string;
  onInsert: (markdown: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const linkableQuery = useLinkableBlocks(characterId, open);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const options = (linkableQuery.data ?? []).filter(
    (b) => b.id !== excludeBlockId && b.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (block: LinkableBlock) => {
    onInsert(`[${block.title}](block:${block.id})`);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-foreground hover:bg-accent/10 inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs transition-colors"
      >
        <Link2 className="size-3.5" />
        Vincular bloco
      </button>

      {open && (
        <div className="border-border/60 bg-popover absolute top-full left-0 z-20 mt-1.5 w-64 border shadow-xl">
          <div className="border-border/60 border-b p-2">
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar bloco pelo título..."
              className="h-8 text-xs"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {linkableQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                Carregando...
              </div>
            ) : options.length === 0 ? (
              <p className="text-muted-foreground px-3 py-3 text-xs italic">
                Nenhum bloco com título encontrado. Só é possível vincular a blocos do tipo
                "Card" ou "Registro expansível" que já tenham um título.
              </p>
            ) : (
              options.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => handleSelect(block)}
                  className={cn(
                    "hover:bg-accent/10 flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs",
                  )}
                >
                  <span className="truncate">{block.title}</span>
                  <span className="dossier-meta shrink-0 text-[10px]">{block.tabName}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
