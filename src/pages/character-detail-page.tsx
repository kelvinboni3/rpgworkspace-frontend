import { useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Camera,
  Download,
  FileUp,
  Loader2,
  Lock,
  NotebookTabs,
  Plus,
  RotateCcw,
  Share2,
  Sparkles,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Label } from "@/components/ui/label";
import { CharacterDashboardSummary } from "@/components/campaign/character-dashboard-summary";
import { CharacterImportDialog } from "@/components/campaign/character-import-dialog";
import { ShareCharacterDialog } from "@/components/campaign/share-character-dialog";
import { CharacterInterviewDialog } from "@/components/campaign/character-interview-dialog";
import { CharacterSearchBar } from "@/components/campaign/character-search-bar";
import { AccentColorPicker, CharacterTabSection } from "@/components/campaign/character-tab-section";
import { NoteStructuringWidget } from "@/components/campaign/note-structuring-widget";
import { SessionRecapCard } from "@/components/campaign/session-recap-card";
import { CharacterMemoryCard } from "@/components/campaign/character-memory-card";
import { CharacterRetrospectiveCard } from "@/components/campaign/character-retrospective-card";
import { paths } from "@/routes/paths";
import { CampaignService } from "@/services/campaign-service";
import { CHARACTER_STATUS_LABELS, CharacterStatus, CharacterService } from "@/services/character-service";
import { CharacterNarrativeService } from "@/services/character-narrative-service";
import { CharacterTabService } from "@/services/character-tab-service";
import { CharacterTabBlockService, type BlockAccentColor } from "@/services/character-tab-block-service";
import { SubscriptionService } from "@/services/subscription-service";
import { characterAccentStyle } from "@/utils/character-accent";
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

function slugify(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "personagem";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const currentUserId = authStore.getUser()?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const [isPortraitLightboxOpen, setIsPortraitLightboxOpen] = useState(false);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

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

  const subscriptionQuery = useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: SubscriptionService.getMine,
  });
  // Enquanto a assinatura carrega, não trava (o backend barra com 402 de qualquer forma).
  const aiLocked = subscriptionQuery.data ? !subscriptionQuery.data.hasAiAccess : false;

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

  const exportMarkdownMutation = useMutation({
    mutationFn: () => CharacterService.exportMarkdown(characterId!),
    onSuccess: (blob) => {
      downloadBlob(blob, `${slugify(characterQuery.data?.name ?? "personagem")}.md`);
    },
  });

  const invalidateCharacter = () => {
    queryClient.invalidateQueries({ queryKey: ["characters", characterId] });
    queryClient.invalidateQueries({ queryKey: ["characters", "mine"] });
  };

  const retireMutation = useMutation({
    mutationFn: async () => {
      const c = characterQuery.data!;
      await CharacterService.update(characterId!, {
        name: c.name,
        description: c.description,
        race: c.race,
        class: c.class,
        level: c.level,
        status: CharacterStatus.Retired,
      });
      // A retrospectiva é IA (exclusiva de assinantes) — encerrar continua funcionando sem ela.
      if (!aiLocked) {
        await CharacterNarrativeService.generateRetrospective(characterId!);
      }
    },
    onSuccess: invalidateCharacter,
  });

  const reopenMutation = useMutation({
    mutationFn: () => {
      const c = characterQuery.data!;
      return CharacterService.update(characterId!, {
        name: c.name,
        description: c.description,
        race: c.race,
        class: c.class,
        level: c.level,
        status: CharacterStatus.Active,
      });
    },
    onSuccess: invalidateCharacter,
  });

  const updateAccentColorMutation = useMutation({
    mutationFn: (color: BlockAccentColor | null) => CharacterService.updateAccentColor(characterId!, color),
    onSuccess: invalidateCharacter,
  });

  const handleRetire = () => {
    const message = aiLocked
      ? `Encerrar a campanha de ${characterQuery.data?.name}? Você pode reabrir depois se mudar de ideia. (Assinantes ganham uma retrospectiva da jornada gerada por IA.)`
      : `Encerrar a campanha de ${characterQuery.data?.name}? Isso gera uma retrospectiva da jornada dele. Você pode reabrir depois se mudar de ideia.`;
    if (window.confirm(message)) {
      retireMutation.mutate();
    }
  };

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
    <div
      className="dossier-theme bg-background animate-fade-in-up -mx-6 -my-8 flex flex-1 flex-col gap-6 px-6 py-8"
      style={characterAccentStyle(characterQuery.data?.accentColor)}
    >
      <div>
        <Link
          to={paths.characters}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar aos personagens
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
          <div className="dossier-frame glass-panel flex flex-col gap-5 px-4 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-6">
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="font-display text-primary text-2xl font-bold break-words sm:text-3xl">
                  {characterQuery.data?.name}
                </h1>
                {characterQuery.data && (
                  <span className="border-primary/40 text-primary rounded-none border px-2 py-0.5 text-xs font-medium tracking-wide">
                    {CHARACTER_STATUS_LABELS[characterQuery.data.status]}
                  </span>
                )}
                {isCharacterOwner && (
                  <AccentColorPicker
                    value={characterQuery.data?.accentColor ?? null}
                    onChange={(color) => updateAccentColorMutation.mutate(color)}
                  />
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
              <div className="flex flex-col items-start gap-2 sm:shrink-0 sm:items-end">
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {isCharacterOwner && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsShareOpen(true)}
                      title="Compartilhar personagem com um link público read-only"
                    >
                      <Share2 className="size-3.5" />
                      Compartilhar
                    </Button>
                  )}
                  {canAccessJournal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => exportMarkdownMutation.mutate()}
                      disabled={exportMarkdownMutation.isPending}
                      title="Exportar diário em Markdown"
                    >
                      {exportMarkdownMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      Exportar
                    </Button>
                  )}
                  {canAccessJournal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => (aiLocked ? navigate(paths.subscription) : setIsInterviewOpen(true))}
                      title={
                        aiLocked
                          ? "Entrevista de criação guiada por IA — exclusiva para assinantes"
                          : "Entrevista de criação guiada por IA"
                      }
                    >
                      {aiLocked ? <Lock className="size-3.5" /> : <Sparkles className="size-3.5" />}
                      Entrevista
                    </Button>
                  )}
                  {canAccessJournal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => (aiLocked ? navigate(paths.subscription) : setIsImportOpen(true))}
                      title={
                        aiLocked
                          ? "Importar ficha existente com IA — exclusivo para assinantes"
                          : "Importar ficha existente com IA"
                      }
                    >
                      {aiLocked ? <Lock className="size-3.5" /> : <FileUp className="size-3.5" />}
                      Importar
                    </Button>
                  )}
                  {isCharacterOwner && characterQuery.data.status !== CharacterStatus.Retired && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRetire}
                      disabled={retireMutation.isPending}
                      title="Encerrar a campanha deste personagem e gerar a retrospectiva"
                    >
                      {retireMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Archive className="size-3.5" />
                      )}
                      Encerrar personagem
                    </Button>
                  )}
                  {isCharacterOwner && characterQuery.data.status === CharacterStatus.Retired && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => reopenMutation.mutate()}
                      disabled={reopenMutation.isPending}
                      title="Reabrir este personagem"
                    >
                      {reopenMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      Reabrir personagem
                    </Button>
                  )}
                </div>
                {retireMutation.isError && (
                  <p className="text-destructive max-w-64 text-left text-xs sm:text-right">
                    {extractErrorMessage(retireMutation.error, "Não foi possível encerrar o personagem.")}
                  </p>
                )}
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
                <CharacterDashboardSummary characterId={characterId} dashboard={dashboardQuery.data} />
              )}

              {characterQuery.data && characterQuery.data.status !== CharacterStatus.Retired && (
                <SessionRecapCard
                  characterId={characterId}
                  characterName={characterQuery.data.name}
                  lastActivityAt={dashboardQuery.data?.recentBlocks[0]?.updatedAt ?? null}
                  locked={aiLocked}
                  savedRecap={characterQuery.data.recapText}
                  savedRecapGeneratedAt={characterQuery.data.recapGeneratedAt}
                />
              )}

              {characterQuery.data && characterQuery.data.status !== CharacterStatus.Retired && (
                <CharacterMemoryCard characterId={characterId} onNavigateToBlock={handleNavigateToBlock} />
              )}

              {characterQuery.data?.status === CharacterStatus.Retired &&
                characterQuery.data.retrospectiveText && (
                  <CharacterRetrospectiveCard
                    name={characterQuery.data.name}
                    race={characterQuery.data.race}
                    class={characterQuery.data.class}
                    level={characterQuery.data.level}
                    portraitSrc={portraitBlobUrl ?? null}
                    retrospectiveText={characterQuery.data.retrospectiveText}
                    accentColor={characterQuery.data.accentColor}
                  />
                )}

              <CharacterSearchBar characterId={characterId} onNavigateToBlock={handleNavigateToBlock} />

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
        <>
          <NoteStructuringWidget
            characterId={characterId}
            tabs={tabs.map((tab) => ({ id: tab.id, name: tab.name }))}
            onApplied={(tabId) => setActiveTab(tabId)}
            locked={aiLocked}
          />
          <CharacterInterviewDialog
            open={isInterviewOpen}
            onClose={() => setIsInterviewOpen(false)}
            characterId={characterId}
            tabs={tabs.map((tab) => ({ id: tab.id, name: tab.name }))}
            onApplied={(tabId) => setActiveTab(tabId)}
          />
          <CharacterImportDialog
            open={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            characterId={characterId}
            tabs={tabs.map((tab) => ({ id: tab.id, name: tab.name }))}
            onApplied={(tabId) => setActiveTab(tabId)}
          />
        </>
      )}

      {isShareOpen && isCharacterOwner && characterQuery.data && (
        <ShareCharacterDialog
          characterId={characterId}
          shareToken={characterQuery.data.publicShareToken}
          tabs={tabs}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
}
