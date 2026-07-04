import { useState } from "react";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CharacterDashboardSummary } from "@/components/campaign/character-dashboard-summary";
import { NarrativeItemsSection } from "@/components/campaign/narrative-items-section";
import { OperationsSection } from "@/components/campaign/operations-section";
import { PlayerNotesSection } from "@/components/campaign/player-notes-section";
import { TheoriesSection } from "@/components/campaign/theories-section";
import { paths } from "@/routes/paths";
import { CampaignService } from "@/services/campaign-service";
import { CHARACTER_STATUS_LABELS, CharacterService } from "@/services/character-service";
import { WorkspaceMemberService, WorkspaceRole } from "@/services/workspace-member-service";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";

const TABS = [
  { key: "notes", label: "Notas" },
  { key: "narrative-items", label: "Itens Narrativos" },
  { key: "theories", label: "Teorias" },
  { key: "operations", label: "Operações" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const [activeTab, setActiveTab] = useState<TabKey>("notes");

  const characterQuery = useQuery({
    queryKey: ["characters", characterId],
    queryFn: () => CharacterService.getById(characterId!),
    enabled: Boolean(characterId),
  });

  const campaignId = characterQuery.data?.campaignId;

  const campaignQuery = useQuery({
    queryKey: ["campaigns", campaignId],
    queryFn: () => CampaignService.getById(campaignId!),
    enabled: Boolean(campaignId),
  });

  const workspaceId = campaignQuery.data?.workspaceId;

  const membersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => WorkspaceMemberService.getAllByWorkspace(workspaceId!),
    enabled: Boolean(workspaceId),
  });

  const currentMember = membersQuery.data?.find((member) => member.userId === currentUserId);
  const isOwnerOrMaster =
    currentMember?.role === WorkspaceRole.Owner || currentMember?.role === WorkspaceRole.Master;
  const isCharacterOwner = characterQuery.data?.userId === currentUserId;
  const canAccessJournal = isOwnerOrMaster || isCharacterOwner;

  const dashboardQuery = useQuery({
    queryKey: ["characters", characterId, "dashboard"],
    queryFn: () => CharacterService.getDashboard(characterId!),
    enabled: Boolean(characterId) && canAccessJournal,
  });

  if (!characterId) return null;

  const isLoading = characterQuery.isLoading || campaignQuery.isLoading || membersQuery.isLoading;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div>
        {campaignId && (
          <Link
            to={paths.campaign(campaignId)}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Voltar à campanha
          </Link>
        )}

        {isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carregando personagem...
          </div>
        ) : characterQuery.isError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <TriangleAlert className="size-4 shrink-0" />
            {extractErrorMessage(characterQuery.error, "Não foi possível carregar este personagem.")}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{characterQuery.data?.name}</h1>
              {characterQuery.data && (
                <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {CHARACTER_STATUS_LABELS[characterQuery.data.status]}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {characterQuery.data &&
                [
                  `Nível ${characterQuery.data.level}`,
                  characterQuery.data.race,
                  characterQuery.data.class,
                ]
                  .filter(Boolean)
                  .join(" · ")}
            </p>
          </div>
        )}
      </div>

      {!isLoading && !characterQuery.isError && (
        <>
          {!canAccessJournal ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
              <TriangleAlert className="size-4 shrink-0" />
              Você não tem permissão para ver o diário deste personagem.
            </div>
          ) : (
            <>
              {dashboardQuery.data && (
                <CharacterDashboardSummary dashboard={dashboardQuery.data} />
              )}

              <div className="border-border/60 flex gap-1 border-b">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                      activeTab === tab.key
                        ? "border-primary text-foreground"
                        : "text-muted-foreground hover:text-foreground border-transparent",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {campaignId && activeTab === "notes" && (
                <PlayerNotesSection characterId={characterId} campaignId={campaignId} />
              )}
              {campaignId && activeTab === "narrative-items" && (
                <NarrativeItemsSection characterId={characterId} campaignId={campaignId} />
              )}
              {activeTab === "theories" && <TheoriesSection characterId={characterId} />}
              {activeTab === "operations" && <OperationsSection characterId={characterId} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
