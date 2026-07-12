import { useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Loader2,
  NotebookTabs,
  Plus,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Label } from "@/components/ui/label";
import { CharacterDashboardSummary } from "@/components/campaign/character-dashboard-summary";
import { CharacterTabSection } from "@/components/campaign/character-tab-section";
import { NoteStructuringWidget } from "@/components/campaign/note-structuring-widget";
import { paths } from "@/routes/paths";
import { CampaignService } from "@/services/campaign-service";
import { CHARACTER_STATUS_LABELS, CharacterService } from "@/services/character-service";
import { CharacterTabService } from "@/services/character-tab-service";
import { CharacterTabBlockService } from "@/services/character-tab-block-service";
import { WorkspaceMemberService, WorkspaceRole } from "@/services/workspace-member-service";
import { authStore } from "@/store/auth-store";
import { useAuthenticatedMedia } from "@/hooks/use-authenticated-media";
import { cn } from "@/utils/cn";
import { resizeImageToBlob } from "@/utils/image";
import { extractErrorMessage } from "@/utils/api-error";

type VitalsFormValues = {
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
};

function vitalPercent(current: number | null, max: number | null) {
  if (!max) return 0;
  return Math.min(100, Math.max(0, ((current ?? 0) / max) * 100));
}

export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const [isPortraitLightboxOpen, setIsPortraitLightboxOpen] = useState(false);

  const handleNavigateToBlock = async (blockId: string) => {
    const block = await CharacterTabBlockService.getById(blockId);
    setActiveTab(block.characterTabId);
    setFocusBlockId(blockId);
  };

  const characterQuery = useQuery({
    queryKey: ["characters", characterId],
    queryFn: () => CharacterService.getById(characterId!),
    enabled: Boolean(characterId),
  });

  const campaignId = characterQuery.data?.campaignId;
  const portraitBlobUrl = useAuthenticatedMedia(characterQuery.data?.portraitUrl);

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

  const isSolo = !characterQuery.data?.campaignId;
  const currentMember = membersQuery.data?.find((member) => member.userId === currentUserId);
  const isOwnerOrMaster =
    currentMember?.role === WorkspaceRole.Owner || currentMember?.role === WorkspaceRole.Master;
  const isCharacterOwner = characterQuery.data?.userId === currentUserId;
  const canAccessJournal = isSolo ? isCharacterOwner : isOwnerOrMaster || isCharacterOwner;

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

  const tabs = tabsQuery.data ?? [];
  const effectiveActiveTab = activeTab ?? tabs[0]?.id ?? null;

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

  const uploadPortraitMutation = useMutation({
    mutationFn: (blob: Blob) => CharacterService.uploadPortrait(characterId!, blob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
    },
  });

  const removePortraitMutation = useMutation({
    mutationFn: () => CharacterService.removePortrait(characterId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
    },
  });

  const handlePortraitFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const blob = await resizeImageToBlob(file);
    uploadPortraitMutation.mutate(blob);
  };

  const [isEditingVitals, setIsEditingVitals] = useState(false);
  const vitalsForm = useForm<VitalsFormValues>();

  const updateVitalsMutation = useMutation({
    mutationFn: (values: VitalsFormValues) =>
      CharacterService.updateVitals(characterId!, {
        hpCurrent: Number.isNaN(values.hpCurrent) ? null : values.hpCurrent,
        hpMax: Number.isNaN(values.hpMax) ? null : values.hpMax,
        mpCurrent: Number.isNaN(values.mpCurrent) ? null : values.mpCurrent,
        mpMax: Number.isNaN(values.mpMax) ? null : values.mpMax,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
      setIsEditingVitals(false);
    },
  });

  const openVitalsForm = () => {
    const c = characterQuery.data;
    vitalsForm.reset({
      hpCurrent: c?.hpCurrent ?? undefined,
      hpMax: c?.hpMax ?? undefined,
      mpCurrent: c?.mpCurrent ?? undefined,
      mpMax: c?.mpMax ?? undefined,
    });
    setIsEditingVitals(true);
  };

  if (!characterId) return null;

  const isLoading = characterQuery.isLoading || campaignQuery.isLoading || membersQuery.isLoading;

  return (
    <div className="dossier-theme animate-fade-in-up flex flex-1 flex-col gap-6">
      <div>
        <Link
          to={campaignId ? paths.campaign(campaignId) : paths.characters}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          {campaignId ? "Voltar à campanha" : "Voltar aos personagens"}
        </Link>

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
            <div className="border-border/60 bg-background/40 group relative size-20 shrink-0 overflow-hidden border">
              {characterQuery.data?.portraitUrl && portraitBlobUrl ? (
                <button
                  type="button"
                  onClick={() => setIsPortraitLightboxOpen(true)}
                  className="block size-full cursor-zoom-in"
                  title="Ver em tela cheia"
                >
                  <img
                    src={portraitBlobUrl}
                    alt="Retrato do personagem"
                    className="size-full object-cover"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => portraitInputRef.current?.click()}
                  className="text-muted-foreground flex size-full items-center justify-center"
                  title="Alterar retrato"
                >
                  <UserRound className="size-8" />
                </button>
              )}
              {characterQuery.data?.portraitUrl && portraitBlobUrl && (
                <button
                  type="button"
                  onClick={() => portraitInputRef.current?.click()}
                  title="Alterar retrato"
                  className="absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {uploadPortraitMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Camera className="size-3.5" />
                  )}
                </button>
              )}
            </div>
            {isPortraitLightboxOpen && portraitBlobUrl && (
              <ImageLightbox
                src={portraitBlobUrl}
                alt="Retrato do personagem"
                onClose={() => setIsPortraitLightboxOpen(false)}
              />
            )}

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
                  onClick={() => removePortraitMutation.mutate()}
                  className="text-muted-foreground hover:text-destructive text-xs underline-offset-2 hover:underline"
                >
                  Remover foto
                </button>
              )}
              {characterQuery.data?.description && (
                <div className="dossier-quote">{characterQuery.data.description}</div>
              )}
            </div>

            {characterQuery.data && (
              <div className="flex shrink-0 flex-col items-end gap-2">
                {characterQuery.data.hpMax != null || characterQuery.data.mpMax != null ? (
                  <button
                    type="button"
                    onClick={openVitalsForm}
                    className="flex flex-col gap-2 text-left"
                    title="Editar PV/PM"
                  >
                    {characterQuery.data.hpMax != null && (
                      <div className="dossier-vital">
                        <div className="dossier-vital-label">
                          <span>PV</span>
                          <span>
                            {characterQuery.data.hpCurrent ?? 0}/{characterQuery.data.hpMax}
                          </span>
                        </div>
                        <div className="dossier-vital-bar">
                          <div
                            className="dossier-vital-fill hp"
                            style={{
                              width: `${vitalPercent(characterQuery.data.hpCurrent, characterQuery.data.hpMax)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {characterQuery.data.mpMax != null && (
                      <div className="dossier-vital">
                        <div className="dossier-vital-label">
                          <span>PM</span>
                          <span>
                            {characterQuery.data.mpCurrent ?? 0}/{characterQuery.data.mpMax}
                          </span>
                        </div>
                        <div className="dossier-vital-bar">
                          <div
                            className="dossier-vital-fill mp"
                            style={{
                              width: `${vitalPercent(characterQuery.data.mpCurrent, characterQuery.data.mpMax)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openVitalsForm}
                    className="dossier-meta text-xs underline-offset-2 hover:underline"
                  >
                    Definir PV/PM
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isEditingVitals && (
          <form
            onSubmit={vitalsForm.handleSubmit((values) => updateVitalsMutation.mutate(values))}
            noValidate
            className="dossier-frame glass-panel mt-3 flex flex-wrap items-end gap-3 px-5 py-4"
          >
            <div className="w-24 space-y-1">
              <Label className="dossier-meta text-xs">PV atual</Label>
              <Input type="number" {...vitalsForm.register("hpCurrent", { valueAsNumber: true })} />
            </div>
            <div className="w-24 space-y-1">
              <Label className="dossier-meta text-xs">PV máximo</Label>
              <Input type="number" {...vitalsForm.register("hpMax", { valueAsNumber: true })} />
            </div>
            <div className="w-24 space-y-1">
              <Label className="dossier-meta text-xs">PM atual</Label>
              <Input type="number" {...vitalsForm.register("mpCurrent", { valueAsNumber: true })} />
            </div>
            <div className="w-24 space-y-1">
              <Label className="dossier-meta text-xs">PM máximo</Label>
              <Input type="number" {...vitalsForm.register("mpMax", { valueAsNumber: true })} />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditingVitals(false)}
              disabled={updateVitalsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateVitalsMutation.isPending}>
              {updateVitalsMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </form>
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

              {tabsQuery.isLoading ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Carregando abas...
                </div>
              ) : (
                <>
                  <div className="dossier-tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn("dossier-tab", effectiveActiveTab === tab.id && "active")}
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

                  {tabs.map(
                    (tab) =>
                      effectiveActiveTab === tab.id && (
                        <CharacterTabSection
                          key={tab.id}
                          tabId={tab.id}
                          tabName={tab.name}
                          characterId={characterId}
                          onTabDeleted={() => setActiveTab(null)}
                          onNavigateToBlock={handleNavigateToBlock}
                          focusBlockId={focusBlockId}
                          onFocusHandled={() => setFocusBlockId(null)}
                        />
                      ),
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {canAccessJournal && (
        <NoteStructuringWidget
          characterId={characterId}
          tabs={tabs.map((tab) => ({ id: tab.id, name: tab.name }))}
          onApplied={(tabId) => setActiveTab(tabId)}
        />
      )}
    </div>
  );
}
