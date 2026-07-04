import { useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  Lightbulb,
  Loader2,
  NotebookTabs,
  Plus,
  Scroll,
  Sparkles,
  Target,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CharacterAttributesSection } from "@/components/campaign/character-attributes-section";
import { CharacterDashboardSummary } from "@/components/campaign/character-dashboard-summary";
import { CharacterTabSection } from "@/components/campaign/character-tab-section";
import { ImportantPeopleSection } from "@/components/campaign/important-people-section";
import { NarrativeItemsSection } from "@/components/campaign/narrative-items-section";
import { OperationsSection } from "@/components/campaign/operations-section";
import { PlayerNotesSection } from "@/components/campaign/player-notes-section";
import { TheoriesSection } from "@/components/campaign/theories-section";
import { paths } from "@/routes/paths";
import { CampaignService } from "@/services/campaign-service";
import { CHARACTER_STATUS_LABELS, CharacterService } from "@/services/character-service";
import { CharacterTabService } from "@/services/character-tab-service";
import { WorkspaceMemberService, WorkspaceRole } from "@/services/workspace-member-service";
import { authStore } from "@/store/auth-store";
import { cn } from "@/utils/cn";
import { resizeImageToDataUrl } from "@/utils/image";
import { extractErrorMessage } from "@/utils/api-error";

const TABS = [
  { key: "status", label: "Status", icon: Sparkles },
  { key: "notes", label: "Notas", icon: BookOpen },
  { key: "narrative-items", label: "Itens Narrativos", icon: Scroll },
  { key: "theories", label: "Teorias", icon: Lightbulb },
  { key: "operations", label: "Operações", icon: Target },
  { key: "important-people", label: "Pessoas", icon: Users },
] as const;

export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("status");
  const [isAddingTab, setIsAddingTab] = useState(false);
  const portraitInputRef = useRef<HTMLInputElement>(null);

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

  const tabsQuery = useQuery({
    queryKey: ["characters", characterId, "tabs"],
    queryFn: () => CharacterTabService.getAllByCharacter(characterId!),
    enabled: Boolean(characterId) && canAccessJournal,
  });

  const customTabs = tabsQuery.data ?? [];

  const {
    register: registerNewTab,
    handleSubmit: handleSubmitNewTab,
    reset: resetNewTabForm,
  } = useForm<{ name: string }>();

  const createTabMutation = useMutation({
    mutationFn: (name: string) => CharacterTabService.create(characterId!, { name }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] });
      setActiveTab(created.id);
      setIsAddingTab(false);
    },
  });

  const openAddTabForm = () => {
    resetNewTabForm({ name: "" });
    setIsAddingTab(true);
  };

  const updatePortraitMutation = useMutation({
    mutationFn: (portraitUrl: string | null) =>
      CharacterService.updatePortrait(characterId!, portraitUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
    },
  });

  const handlePortraitFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const dataUrl = await resizeImageToDataUrl(file);
    updatePortraitMutation.mutate(dataUrl);
  };

  if (!characterId) return null;

  const isLoading = characterQuery.isLoading || campaignQuery.isLoading || membersQuery.isLoading;

  return (
    <div className="dossier-theme animate-fade-in-up flex flex-1 flex-col gap-6">
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
          <div className="dossier-frame glass-panel flex items-start gap-5 px-6 py-5">
            <input
              ref={portraitInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePortraitFileSelected}
            />
            <button
              type="button"
              onClick={() => portraitInputRef.current?.click()}
              className="border-border/60 bg-background/40 group relative size-20 shrink-0 overflow-hidden border"
              title="Alterar retrato"
            >
              {characterQuery.data?.portraitUrl ? (
                <img
                  src={characterQuery.data.portraitUrl}
                  alt="Retrato do personagem"
                  className="size-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground flex size-full items-center justify-center">
                  <UserRound className="size-8" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                {updatePortraitMutation.isPending ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  <Camera className="size-5 text-white" />
                )}
              </div>
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="dossier-eyebrow">Ficha · Dossiê Pessoal</div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-primary text-3xl font-bold">
                  {characterQuery.data?.name}
                </h1>
                {characterQuery.data && (
                  <span className="border-primary/40 text-primary rounded-none border px-2 py-0.5 text-xs font-medium tracking-wide">
                    {CHARACTER_STATUS_LABELS[characterQuery.data.status]}
                  </span>
                )}
              </div>
              <p className="dossier-meta text-xs">
                {characterQuery.data &&
                  [
                    `Nível ${characterQuery.data.level}`,
                    characterQuery.data.race,
                    characterQuery.data.class,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
              </p>
              {characterQuery.data?.portraitUrl && (
                <button
                  type="button"
                  onClick={() => updatePortraitMutation.mutate(null)}
                  className="text-muted-foreground hover:text-destructive text-xs underline-offset-2 hover:underline"
                >
                  Remover foto
                </button>
              )}
            </div>
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

              <div className="dossier-tabs">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={cn("dossier-tab", activeTab === tab.key && "active")}
                    >
                      <Icon className="dossier-tab-icon size-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
                {customTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn("dossier-tab", activeTab === tab.id && "active")}
                  >
                    <NotebookTabs className="dossier-tab-icon size-3.5" />
                    {tab.name}
                  </button>
                ))}
                <button type="button" onClick={openAddTabForm} className="dossier-tab">
                  <Plus className="dossier-tab-icon size-3.5" />
                  Nova aba
                </button>
              </div>

              {isAddingTab && (
                <form
                  onSubmit={handleSubmitNewTab((values) => createTabMutation.mutate(values.name))}
                  noValidate
                  className="flex items-end gap-2"
                >
                  <div className="max-w-xs flex-1 space-y-2">
                    <Input
                      placeholder="Nome da nova aba (ex.: Persona, Quarto...)"
                      {...registerNewTab("name", { required: true, maxLength: 100 })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddingTab(false)}
                    disabled={createTabMutation.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createTabMutation.isPending}>
                    {createTabMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    Criar aba
                  </Button>
                </form>
              )}

              {activeTab === "status" && (
                <CharacterAttributesSection characterId={characterId} />
              )}
              {campaignId && activeTab === "notes" && (
                <PlayerNotesSection characterId={characterId} campaignId={campaignId} />
              )}
              {campaignId && activeTab === "narrative-items" && (
                <NarrativeItemsSection characterId={characterId} campaignId={campaignId} />
              )}
              {activeTab === "theories" && <TheoriesSection characterId={characterId} />}
              {activeTab === "operations" && <OperationsSection characterId={characterId} />}
              {activeTab === "important-people" && (
                <ImportantPeopleSection characterId={characterId} />
              )}
              {customTabs.map(
                (tab) =>
                  activeTab === tab.id && (
                    <CharacterTabSection
                      key={tab.id}
                      tabId={tab.id}
                      tabName={tab.name}
                      characterId={characterId}
                      onTabDeleted={() => setActiveTab("notes")}
                    />
                  ),
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
