import { useState } from "react";
import { isAxiosError } from "axios";
import { Dices, Loader2, NotebookTabs, TriangleAlert, UserRound } from "lucide-react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PublicBlockView } from "@/components/public/public-block-view";
import { paths } from "@/routes/paths";
import { CHARACTER_STATUS_LABELS } from "@/services/character-service";
import { PublicCharacterService } from "@/services/public-character-service";
import { characterAccentStyle } from "@/utils/character-accent";
import { cn } from "@/utils/cn";

function vitalPercent(current: number | null, max: number | null) {
  if (!max) return 0;
  return Math.min(100, Math.max(0, ((current ?? 0) / max) * 100));
}

export function PublicCharacterPage() {
  const { token } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<number | null>(null);

  const query = useQuery({
    queryKey: ["public-character", token],
    queryFn: () => PublicCharacterService.getByToken(token!),
    enabled: Boolean(token),
    retry: false,
  });

  const character = query.data;
  const tabs = character?.tabs ?? [];
  const effectiveActiveTab = activeTab ?? 0;

  const notFound = isAxiosError(query.error) && query.error.response?.status === 404;

  return (
    <div className="dossier-theme bg-background min-h-screen">
      <div
        className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6"
        style={characterAccentStyle(character?.accentColor)}
      >
        {query.isLoading ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-24 text-sm">
            <Loader2 className="size-5 animate-spin" />
            Carregando personagem...
          </div>
        ) : query.isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
            <TriangleAlert className="text-destructive size-8" />
            <p className="text-muted-foreground max-w-sm text-sm">
              {notFound
                ? "Este link de personagem não existe ou foi desativado pelo dono."
                : "Não foi possível carregar este personagem."}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={paths.landing}>Conhecer o Aventurário</Link>
            </Button>
          </div>
        ) : character ? (
          <>
            {/* Card do personagem */}
            <div className="dossier-frame glass-panel flex flex-col gap-5 px-4 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-6">
              <div className="border-border/60 bg-background/40 size-20 shrink-0 overflow-hidden border">
                {character.portraitUrl ? (
                  <img
                    src={character.portraitUrl}
                    alt={`Retrato de ${character.name}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground flex size-full items-center justify-center">
                    <UserRound className="size-8" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="dossier-eyebrow">Ficha · Dossiê Pessoal</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="font-display text-primary text-2xl font-bold break-words sm:text-3xl">
                    {character.name}
                  </h1>
                  <span className="border-primary/40 text-primary rounded-none border px-2 py-0.5 text-xs font-medium tracking-wide">
                    {CHARACTER_STATUS_LABELS[character.status]}
                  </span>
                </div>
                <p className="dossier-meta text-xs">
                  {[`Nível ${character.level}`, character.race, character.class]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {character.description && <div className="dossier-quote">{character.description}</div>}
              </div>

              {(character.hpMax != null || character.mpMax != null) && (
                <div className="flex flex-col gap-2 sm:shrink-0">
                  {character.hpMax != null && (
                    <div className="dossier-vital">
                      <div className="dossier-vital-label">
                        <span>PV</span>
                        <span>
                          {character.hpCurrent ?? 0}/{character.hpMax}
                        </span>
                      </div>
                      <div className="dossier-vital-bar">
                        <div
                          className="dossier-vital-fill hp"
                          style={{ width: `${vitalPercent(character.hpCurrent, character.hpMax)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {character.mpMax != null && (
                    <div className="dossier-vital">
                      <div className="dossier-vital-label">
                        <span>PM</span>
                        <span>
                          {character.mpCurrent ?? 0}/{character.mpMax}
                        </span>
                      </div>
                      <div className="dossier-vital-bar">
                        <div
                          className="dossier-vital-fill mp"
                          style={{ width: `${vitalPercent(character.mpCurrent, character.mpMax)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Abas públicas */}
            {tabs.length === 0 ? (
              <p className="text-muted-foreground py-16 text-center text-sm italic">
                O dono ainda não tornou nenhuma seção do diário pública.
              </p>
            ) : (
              <>
                <div className="dossier-tabs">
                  {tabs.map((tab, index) => (
                    <button
                      key={`${tab.name}-${index}`}
                      type="button"
                      onClick={() => setActiveTab(index)}
                      className={cn("dossier-tab", effectiveActiveTab === index && "active")}
                    >
                      <NotebookTabs className="dossier-tab-icon size-3.5" />
                      {tab.name}
                    </button>
                  ))}
                </div>

                {tabs[effectiveActiveTab] && (
                  <div className="dossier-frame glass-panel flex flex-col gap-5 px-4 py-5 sm:px-8 sm:py-7">
                    <span className="dossier-eyebrow">{tabs[effectiveActiveTab].name}</span>
                    {tabs[effectiveActiveTab].blocks.length === 0 ? (
                      <p className="text-muted-foreground py-8 text-center text-sm italic">
                        Nenhum registro nesta seção.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-5">
                        {tabs[effectiveActiveTab].blocks.map((block) => (
                          <PublicBlockView key={block.id} block={block} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* CTA viral */}
            <div className="border-border/60 mt-auto flex flex-col items-center gap-3 border-t border-dashed pt-8 pb-4 text-center">
              <p className="text-muted-foreground text-xs">
                Esta ficha foi criada com
              </p>
              <Link
                to={paths.landing}
                className="text-primary hover:text-primary/80 inline-flex items-center gap-2 transition-colors"
              >
                <Dices className="size-5" />
                <span className="font-display text-lg font-semibold">Aventurário</span>
              </Link>
              <p className="text-muted-foreground max-w-xs text-xs">
                O diário definitivo do seu personagem de RPG. Crie o seu — 7 dias grátis.
              </p>
              <Button asChild size="sm" className="mt-1">
                <Link to={paths.register}>Criar meu personagem</Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
