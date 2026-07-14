import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Share2, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { paths } from "@/routes/paths";
import { CharacterService } from "@/services/character-service";
import { CharacterTabService, type CharacterTab } from "@/services/character-tab-service";
import { cn } from "@/utils/cn";

export function ShareCharacterDialog({
  characterId,
  shareToken,
  tabs,
  onClose,
}: {
  characterId: string;
  shareToken: string | null;
  tabs: CharacterTab[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const isShared = Boolean(shareToken);
  const shareUrl = shareToken
    ? `${window.location.origin}${paths.publicCharacter(shareToken)}`
    : null;

  const invalidateCharacter = () => {
    queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
    queryClient.invalidateQueries({ queryKey: ["characters", "mine"] });
  };

  const enableMutation = useMutation({
    mutationFn: () => CharacterService.enableShare(characterId),
    onSuccess: invalidateCharacter,
  });

  const disableMutation = useMutation({
    mutationFn: () => CharacterService.disableShare(characterId),
    onSuccess: invalidateCharacter,
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ tabId, isPublic }: { tabId: string; isPublic: boolean }) =>
      CharacterTabService.setVisibility(tabId, isPublic),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] }),
  });

  const publicTabCount = tabs.filter((t) => t.isPublic).length;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="dossier-frame glass-panel flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto px-5 py-6 sm:px-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Share2 className="text-primary size-5" />
            <h2 className="font-display text-primary text-xl font-bold">Compartilhar personagem</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>

        {!isShared ? (
          <>
            <p className="text-muted-foreground text-sm">
              Gere um link público read-only para mostrar seu personagem. Você escolhe quais
              seções do diário ficam visíveis — o resto continua privado.
            </p>
            <Button
              type="button"
              onClick={() => enableMutation.mutate()}
              disabled={enableMutation.isPending}
              className="self-start"
            >
              {enableMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              Ativar link público
            </Button>
          </>
        ) : (
          <>
            {/* Link */}
            <div className="space-y-2">
              <label className="dossier-meta text-[10px] tracking-widest uppercase">
                Link público
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl ?? ""}
                  onFocus={(e) => e.target.select()}
                  className="border-border/60 bg-background/40 text-foreground min-w-0 flex-1 border px-3 py-2 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                {shareUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={shareUrl} target="_blank" rel="noreferrer" title="Abrir link">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Seleção de abas */}
            <div className="space-y-2">
              <label className="dossier-meta text-[10px] tracking-widest uppercase">
                Seções visíveis no link ({publicTabCount})
              </label>
              <div className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <label
                    key={tab.id}
                    className={cn(
                      "border-border/60 hover:bg-card/60 flex cursor-pointer items-center gap-3 border px-3 py-2 text-sm transition-colors",
                      tab.isPublic && "border-primary/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={tab.isPublic}
                      disabled={visibilityMutation.isPending}
                      onChange={(e) =>
                        visibilityMutation.mutate({ tabId: tab.id, isPublic: e.target.checked })
                      }
                      className="accent-primary size-4"
                    />
                    <span className="flex-1">{tab.name}</span>
                    {tab.isPublic && <span className="text-primary text-xs">Pública</span>}
                  </label>
                ))}
              </div>
              {publicTabCount === 0 && (
                <p className="text-muted-foreground text-xs italic">
                  Nenhuma seção marcada — quem abrir o link verá só o card (nome, retrato, vitais).
                </p>
              )}
            </div>

            {/* Desativar */}
            <div className="border-border/60 flex items-center justify-between gap-3 border-t border-dashed pt-4">
              <p className="text-muted-foreground text-xs">
                Desativar invalida o link atual para sempre.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => disableMutation.mutate()}
                disabled={disableMutation.isPending}
              >
                {disableMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Desativar link
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
