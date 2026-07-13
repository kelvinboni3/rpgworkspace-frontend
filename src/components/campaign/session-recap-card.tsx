import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, ScrollText, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import { paths } from "@/routes/paths";
import { CharacterNarrativeService } from "@/services/character-narrative-service";
import { extractErrorMessage } from "@/utils/api-error";
import { daysSince } from "@/utils/date";

const INACTIVITY_THRESHOLD_DAYS = 4;

function generatedAtLabel(generatedAt: string) {
  const days = daysSince(generatedAt);
  if (days <= 0) return "Gerado hoje";
  if (days === 1) return "Gerado ontem";
  return `Gerado há ${days} dias`;
}

export function SessionRecapCard({
  characterId,
  characterName,
  lastActivityAt,
  locked = false,
  savedRecap,
  savedRecapGeneratedAt,
}: {
  characterId: string;
  characterName: string;
  lastActivityAt: string | null;
  locked?: boolean;
  savedRecap: string | null;
  savedRecapGeneratedAt: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const recapMutation = useMutation({
    mutationFn: () => CharacterNarrativeService.generateRecap(characterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
    },
  });

  const daysInactive = lastActivityAt ? daysSince(lastActivityAt) : null;
  const isInactive = daysInactive !== null && daysInactive >= INACTIVITY_THRESHOLD_DAYS;

  const displayedRecap =
    recapMutation.data ??
    (savedRecap && savedRecapGeneratedAt
      ? { recap: savedRecap, generatedAt: savedRecapGeneratedAt }
      : null);

  if (displayedRecap) {
    return (
      <Card className="glass-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ScrollText className="text-primary size-4" />
            Anteriormente, nessa história...
          </h3>
          <span className="text-muted-foreground text-xs">
            {generatedAtLabel(displayedRecap.generatedAt)}
          </span>
        </div>
        <DossierMarkdown text={displayedRecap.recap} />
        {recapMutation.isError && (
          <p className="text-destructive mt-2 flex items-center gap-1.5 text-xs">
            <TriangleAlert className="size-3.5 shrink-0" />
            {extractErrorMessage(recapMutation.error, "Não foi possível gerar o recap.")}
          </p>
        )}
        {locked ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => navigate(paths.subscription)}
            title="Recap por IA — exclusivo para assinantes"
          >
            <Lock className="size-3.5" />
            Assinar para gerar novamente
          </Button>
        ) : (
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
        )}
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
            {locked
              ? "O recap gerado por IA é exclusivo para assinantes."
              : isInactive
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
      {locked ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate(paths.subscription)}
          title="Recap por IA — exclusivo para assinantes"
        >
          <Lock className="size-3.5" />
          Assinar para desbloquear
        </Button>
      ) : (
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
      )}
    </Card>
  );
}
