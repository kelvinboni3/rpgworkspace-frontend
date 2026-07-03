import { useState } from "react";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CharactersSection } from "@/components/campaign/characters-section";
import { LocationsSection } from "@/components/campaign/locations-section";
import { NpcsSection } from "@/components/campaign/npcs-section";
import { QuestsSection } from "@/components/campaign/quests-section";
import { SessionsSection } from "@/components/campaign/sessions-section";
import { paths } from "@/routes/paths";
import { CampaignService } from "@/services/campaign-service";
import { WorkspaceMemberService, WorkspaceRole } from "@/services/workspace-member-service";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { extractErrorMessage } from "@/utils/api-error";

const TABS = [
  { key: "characters", label: "Personagens" },
  { key: "sessions", label: "Sessões" },
  { key: "npcs", label: "NPCs" },
  { key: "locations", label: "Locais" },
  { key: "quests", label: "Quests" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const [activeTab, setActiveTab] = useState<TabKey>("characters");

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

  if (!campaignId) return null;

  return (
    <div className="animate-fade-in-up flex flex-1 flex-col gap-6">
      <div>
        {workspaceId && (
          <Link
            to={paths.workspace(workspaceId)}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="size-4" />
            Voltar ao workspace
          </Link>
        )}

        {campaignQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carregando campanha...
          </div>
        ) : campaignQuery.isError ? (
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <TriangleAlert className="size-4 shrink-0" />
            {extractErrorMessage(campaignQuery.error, "Não foi possível carregar esta campanha.")}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold">{campaignQuery.data?.name}</h1>
              {campaignQuery.data?.systemName && (
                <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {campaignQuery.data.systemName}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {campaignQuery.data?.description || "Sem descrição."}
            </p>
          </div>
        )}
      </div>

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

      {activeTab === "characters" && (
        <CharactersSection
          campaignId={campaignId}
          currentUserId={currentUserId}
          members={membersQuery.data ?? []}
        />
      )}
      {activeTab === "sessions" && (
        <SessionsSection campaignId={campaignId} isOwnerOrMaster={isOwnerOrMaster} />
      )}
      {activeTab === "npcs" && (
        <NpcsSection campaignId={campaignId} isOwnerOrMaster={isOwnerOrMaster} />
      )}
      {activeTab === "locations" && (
        <LocationsSection campaignId={campaignId} isOwnerOrMaster={isOwnerOrMaster} />
      )}
      {activeTab === "quests" && (
        <QuestsSection campaignId={campaignId} isOwnerOrMaster={isOwnerOrMaster} />
      )}
    </div>
  );
}
