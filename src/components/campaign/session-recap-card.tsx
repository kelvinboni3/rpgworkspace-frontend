import { useMutation } from "@tanstack/react-query";
import { Loader2, ScrollText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import { CharacterNarrativeService } from "@/services/character-narrative-service";
import { extractErrorMessage } from "@/utils/api-error";
import { daysSince } from "@/utils/date";

const INACTIVITY_THRESHOLD_DAYS = 4;

export function SessionRecapCard({
  characterId,
  characterName,
  lastActivityAt,
}: {
  characterId: string;
  characterName: string;
  lastActivityAt: string | null;
}) {
  const recapMutation = useMutation({
    mutationFn: () => CharacterNarrativeService.generateRecap(characterId),
  });

  const daysInactive = lastActivityAt ? daysSince(lastActivityAt) : null;
  const isInactive = daysInactive !== null && daysInactive >= INACTIVITY_THRESHOLD_DAYS;

  if (recapMutation.data) {
    return (
      <Card className="glass-panel p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <ScrollText className="text-primary size-4" />
          Anteriormente, nessa história...
        </h3>
        <DossierMarkdown text={recapMutation.data.recap} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => recapMutation.mutate()}
          disabled={recapMutation.isPending}
        >
          {recapMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Gerar novamente
        </Button>
      </Card>
    );
  }

  return (
    <Card className="glass-panel flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-start gap-2.5">
        <ScrollText className="text-primary mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">
            {isInactive
              ? `Faz ${daysInactive} dias que você não visita ${characterName}.`
              : "Prepare-se para a próxima sessão."}
          </p>
          <p className="text-muted-foreground text-xs">
            {isInactive
              ? "Quer um resumo antes da próxima sessão?"
              : "Gere um recap do que já aconteceu com esse personagem, quando quiser."}
          </p>
          {recapMutation.isError && (
            <p className="text-destructive flex items-center gap-1.5 text-xs">
              <TriangleAlert className="size-3.5 shrink-0" />
              {extractErrorMessage(recapMutation.error, "Não foi possível gerar o recap.")}
            </p>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant={isInactive ? "default" : "outline"}
        size="sm"
        onClick={() => recapMutation.mutate()}
        disabled={recapMutation.isPending}
      >
        {recapMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
        Gerar recap
      </Button>
    </Card>
  );
}
