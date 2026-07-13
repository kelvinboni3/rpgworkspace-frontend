import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import { CharacterNarrativeService } from "@/services/character-narrative-service";
import { daysSince } from "@/utils/date";

export function CharacterMemoryCard({
  characterId,
  onNavigateToBlock,
}: {
  characterId: string;
  onNavigateToBlock: (blockId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const memoryQuery = useQuery({
    queryKey: ["characters", characterId, "memory"],
    queryFn: () => CharacterNarrativeService.getMemory(characterId),
  });

  const memory = memoryQuery.data;
  if (!memory) return null;

  const days = daysSince(memory.createdAt);

  return (
    <Card className="glass-panel p-4">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <History className="text-primary size-4" />
          Há {days} {days === 1 ? "dia" : "dias"}, você escreveu isto...
        </h3>
        {isOpen ? (
          <ChevronUp className="text-muted-foreground size-4 shrink-0" />
        ) : (
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2">
          <p className="dossier-meta mb-2 text-xs">
            {memory.tabName}
            {memory.title ? ` · ${memory.title}` : ""}
          </p>
          <DossierMarkdown text={memory.content} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onNavigateToBlock(memory.blockId)}
          >
            Ver bloco
          </Button>
        </div>
      )}
    </Card>
  );
}
