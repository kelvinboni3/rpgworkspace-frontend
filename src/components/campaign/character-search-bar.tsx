import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { SearchService } from "@/services/search-service";

export function CharacterSearchBar({
  characterId,
  onNavigateToBlock,
}: {
  characterId: string;
  onNavigateToBlock: (blockId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

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

  const searchQuery = useQuery({
    queryKey: ["characters", characterId, "search", debouncedQuery],
    queryFn: () => SearchService.searchCharacter(characterId, debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const results = searchQuery.data ?? [];

  const handleSelect = (blockId: string) => {
    onNavigateToBlock(blockId);
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
  };

  const clear = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  return (
    <div className="relative w-full max-w-xs" ref={containerRef}>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar no diário..."
          className="h-9 pl-8"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            title="Limpar busca"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && debouncedQuery.length > 0 && (
        <div className="border-border/60 bg-popover absolute top-full left-0 z-20 mt-1.5 w-full min-w-64 border shadow-xl">
          <div className="max-h-72 overflow-y-auto py-1">
            {searchQuery.isLoading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
                <Loader2 className="size-3.5 animate-spin" />
                Buscando...
              </div>
            ) : results.length === 0 ? (
              <p className="text-muted-foreground px-3 py-3 text-xs italic">
                Nada encontrado para "{debouncedQuery}".
              </p>
            ) : (
              results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result.id)}
                  className="hover:bg-accent/10 flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left"
                >
                  <span className="truncate text-sm">{result.title}</span>
                  {result.description && (
                    <span className="dossier-meta line-clamp-1 text-xs">{result.description}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
