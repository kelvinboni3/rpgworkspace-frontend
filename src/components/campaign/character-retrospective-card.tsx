import { useState } from "react";
import { Archive, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import { CharacterRetrospectivePoster } from "@/components/campaign/character-retrospective-poster";
import type { BlockAccentColor } from "@/services/character-tab-block-service";

export function CharacterRetrospectiveCard({
  name,
  race,
  class: characterClass,
  level,
  portraitSrc,
  retrospectiveText,
  accentColor,
}: {
  name: string;
  race: string | null;
  class: string | null;
  level: number;
  portraitSrc: string | null;
  retrospectiveText: string;
  accentColor: BlockAccentColor | null;
}) {
  const [isPosterOpen, setIsPosterOpen] = useState(false);

  return (
    <Card className="glass-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Archive className="text-primary size-4" />
          Retrospectiva
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsPosterOpen(true)}>
          <Maximize2 className="size-3.5" />
          Ver em tela cheia
        </Button>
      </div>
      <DossierMarkdown text={retrospectiveText} />

      {isPosterOpen && (
        <CharacterRetrospectivePoster
          name={name}
          race={race}
          class={characterClass}
          level={level}
          portraitSrc={portraitSrc}
          retrospectiveText={retrospectiveText}
          accentColor={accentColor}
          onClose={() => setIsPosterOpen(false)}
        />
      )}
    </Card>
  );
}
