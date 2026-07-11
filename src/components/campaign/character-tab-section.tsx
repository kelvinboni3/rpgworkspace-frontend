import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  GripVertical,
  IdCard,
  ImageIcon,
  Loader2,
  Minus,
  PanelBottomOpen,
  Pencil,
  Plus,
  Quote as QuoteIcon,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import {
  BLOCK_ACCENT_COLOR_LABELS,
  BLOCK_ACCENT_COLORS,
  CHARACTER_TAB_BLOCK_TYPE_LABELS,
  CharacterTabBlockService,
  CharacterTabBlockType,
  type BlockAccentColor,
  type CardBlockPayload,
  type CharacterTabBlock,
  type CharacterTabBlockTypeValue,
  IMAGE_BLOCK_POSITION_LABELS,
  IMAGE_BLOCK_POSITIONS,
  IMAGE_BLOCK_SIZE_LABELS,
  IMAGE_BLOCK_SIZES,
  type ImageBlockPayload,
  type ImageBlockPosition,
  type ImageBlockSize,
  type TableBlockPayload,
  type UpdateCharacterTabBlockRequest,
} from "@/services/character-tab-block-service";
import { CharacterTabService } from "@/services/character-tab-service";
import { BookVolumeService } from "@/services/book-volume-service";
import { BlockLinkPicker } from "@/components/campaign/block-link-picker";
import { BookReaderDialog } from "@/components/campaign/book-reader-dialog";
import { MentionDropdown } from "@/components/campaign/mention-dropdown";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import { useAuthenticatedMedia } from "@/hooks/use-authenticated-media";
import { extractErrorMessage } from "@/utils/api-error";
import { resizeImageToBlob } from "@/utils/image";
import { cn } from "@/utils/cn";

function findBlockById(blocks: CharacterTabBlock[], id: string): CharacterTabBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    const inChildren = findBlockById(block.children, id);
    if (inChildren) return inChildren;
  }
  return null;
}

const BLOCK_TYPE_ICONS: Record<CharacterTabBlockTypeValue, ComponentType<{ className?: string }>> = {
  [CharacterTabBlockType.Text]: AlignLeft,
  [CharacterTabBlockType.Quote]: QuoteIcon,
  [CharacterTabBlockType.Card]: IdCard,
  [CharacterTabBlockType.Table]: TableIcon,
  [CharacterTabBlockType.Image]: ImageIcon,
  [CharacterTabBlockType.Divider]: Minus,
  [CharacterTabBlockType.Collapse]: PanelBottomOpen,
  [CharacterTabBlockType.Book]: BookOpen,
};

const ACCENT_COLOR_VARS: Record<BlockAccentColor, string> = {
  gold: "--primary",
  crimson: "--accent",
  violet: "--dossier-violet",
};

function accentColorValue(color: BlockAccentColor | null | undefined): string | undefined {
  return color ? `hsl(var(${ACCENT_COLOR_VARS[color]}))` : undefined;
}

function accentBorderStyle(color: BlockAccentColor | null | undefined): CSSProperties | undefined {
  const value = accentColorValue(color);
  return value ? { borderLeftColor: value, borderLeftWidth: "3px" } : undefined;
}

function accentTextStyle(color: BlockAccentColor | null | undefined): CSSProperties | undefined {
  const value = accentColorValue(color);
  return value ? { color: value } : undefined;
}

const ACCENT_CAPABLE_TYPES: CharacterTabBlockTypeValue[] = [CharacterTabBlockType.Card, CharacterTabBlockType.Collapse];

function AccentColorPicker({
  value,
  onChange,
}: {
  value: BlockAccentColor | null;
  onChange: (color: BlockAccentColor | null) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-0.5" title="Cor de destaque">
      <button
        type="button"
        title="Sem cor de destaque"
        onClick={() => onChange(null)}
        className={cn(
          "border-border/60 bg-background/40 size-3.5 shrink-0 rounded-full border",
          !value && "ring-foreground ring-offset-background ring-1 ring-offset-1",
        )}
      />
      {BLOCK_ACCENT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={BLOCK_ACCENT_COLOR_LABELS[color]}
          onClick={() => onChange(color)}
          style={{ backgroundColor: accentColorValue(color) }}
          className={cn(
            "border-border/60 size-3.5 shrink-0 rounded-full border",
            value === color && "ring-foreground ring-offset-background ring-1 ring-offset-1",
          )}
        />
      ))}
    </div>
  );
}

function parseCardPayload(json: string | null): CardBlockPayload {
  if (!json) return { rows: [] };
  try {
    const parsed = JSON.parse(json);
    return { rows: Array.isArray(parsed?.rows) ? parsed.rows : [] };
  } catch {
    return { rows: [] };
  }
}

function parseTablePayload(json: string | null): TableBlockPayload {
  if (!json) return { headers: ["Coluna 1", "Coluna 2"], rows: [["", ""]] };
  try {
    const parsed = JSON.parse(json);
    return {
      headers: Array.isArray(parsed?.headers) ? parsed.headers : [],
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
    };
  } catch {
    return { headers: ["Coluna 1", "Coluna 2"], rows: [["", ""]] };
  }
}

const CUSTOM_WIDTH_MIN = 15;
const CUSTOM_WIDTH_MAX = 100;
const SIDE_BY_SIDE_DEFAULT_WIDTH = 40;

function parseImagePayload(json: string | null): ImageBlockPayload {
  if (!json) return { url: "", caption: "", size: "medium", position: "center" };
  try {
    const parsed = JSON.parse(json);
    const size = IMAGE_BLOCK_SIZES.includes(parsed?.size) ? (parsed.size as ImageBlockSize) : "medium";
    const position = IMAGE_BLOCK_POSITIONS.includes(parsed?.position)
      ? (parsed.position as ImageBlockPosition)
      : "center";
    const width =
      typeof parsed?.width === "number" && Number.isFinite(parsed.width)
        ? Math.min(CUSTOM_WIDTH_MAX, Math.max(CUSTOM_WIDTH_MIN, parsed.width))
        : undefined;
    return { url: parsed?.url ?? "", caption: parsed?.caption ?? "", size, width, position };
  } catch {
    return { url: "", caption: "", size: "medium", position: "center" };
  }
}

const IMAGE_BLOCK_SIZE_CLASSES: Record<ImageBlockSize, string> = {
  small: "max-w-[200px]",
  medium: "max-w-md",
  large: "max-w-2xl",
  original: "max-w-full",
};

function defaultsForType(type: CharacterTabBlockTypeValue) {
  switch (type) {
    case CharacterTabBlockType.Card:
      return { title: "Novo card", payloadJson: JSON.stringify({ rows: [{ k: "Atributo", v: "Valor" }] }) };
    case CharacterTabBlockType.Table:
      return { payloadJson: JSON.stringify({ headers: ["Coluna 1", "Coluna 2"], rows: [["", ""]] }) };
    case CharacterTabBlockType.Image:
      return { payloadJson: JSON.stringify({ url: "", caption: "", size: "medium", position: "center" }) };
    case CharacterTabBlockType.Collapse:
      return { title: "Novo registro", content: "" };
    case CharacterTabBlockType.Book:
      return { title: "Novo livro" };
    case CharacterTabBlockType.Quote:
      return { content: "Uma citação marcante..." };
    default:
      return { content: "" };
  }
}

export function CharacterTabSection({
  tabId,
  tabName,
  characterId,
  onTabDeleted,
  onNavigateToBlock,
  focusBlockId,
  onFocusHandled,
}: {
  tabId: string;
  tabName: string;
  characterId: string;
  onTabDeleted: () => void;
  onNavigateToBlock: (blockId: string) => void;
  focusBlockId?: string | null;
  onFocusHandled?: () => void;
}) {
  const [isRenamingTab, setIsRenamingTab] = useState(false);
  const [tabNameDraft, setTabNameDraft] = useState(tabName);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const blocksQuery = useQuery({
    queryKey: ["character-tabs", tabId, "blocks"],
    queryFn: () => CharacterTabBlockService.getAllByTab(tabId),
  });

  const blocks = blocksQuery.data ?? [];

  useEffect(() => {
    if (!focusBlockId) return;
    const target = findBlockById(blocks, focusBlockId);
    if (!target) return;

    // A closed "Registro expansível" ancestor opens itself via its own effect reacting
    // to this same focusBlockId — that's a separate render/commit, so the element may
    // not exist in the DOM yet on this first pass. Retry across a few frames rather
    // than giving up immediately.
    let attempts = 0;
    let rafId: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const tryScroll = () => {
      const el = document.getElementById(`block-${focusBlockId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("dossier-flash");
        timeout = setTimeout(() => el.classList.remove("dossier-flash"), 1500);
        onFocusHandled?.();
        return;
      }
      attempts += 1;
      if (attempts < 15) rafId = requestAnimationFrame(tryScroll);
    };

    tryScroll();

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBlockId, blocks]);

  const invalidateBlocks = () =>
    queryClient.invalidateQueries({ queryKey: ["character-tabs", tabId, "blocks"] });

  const invalidateTabs = () =>
    queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] });

  const createMutation = useMutation({
    mutationFn: (type: CharacterTabBlockTypeValue) =>
      CharacterTabBlockService.create(tabId, { type, ...defaultsForType(type) }),
    onSuccess: (created) => {
      invalidateBlocks();
      setEditingBlockId(created.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateCharacterTabBlockRequest }) =>
      CharacterTabBlockService.update(id, values),
    onSuccess: () => {
      invalidateBlocks();
      setEditingBlockId(null);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
      CharacterTabBlockService.move(id, direction),
    onSuccess: () => invalidateBlocks(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CharacterTabBlockService.remove(id),
    onSuccess: () => invalidateBlocks(),
  });

  const accentColorMutation = useMutation({
    mutationFn: ({ id, accentColor }: { id: string; accentColor: BlockAccentColor | null }) =>
      CharacterTabBlockService.updateAccentColor(id, accentColor),
    onSuccess: () => invalidateBlocks(),
  });

  const blocksQueryKey = ["character-tabs", tabId, "blocks"];

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => CharacterTabBlockService.reorder(tabId, orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: blocksQueryKey });
      const previous = queryClient.getQueryData<CharacterTabBlock[]>(blocksQueryKey);
      if (previous) {
        const byId = new Map(previous.map((b) => [b.id, b]));
        queryClient.setQueryData<CharacterTabBlock[]>(
          blocksQueryKey,
          orderedIds.map((id, i) => ({ ...byId.get(id)!, order: i })),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(blocksQueryKey, context.previous);
    },
    onSettled: () => invalidateBlocks(),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderMutation.mutate(arrayMove(blocks, oldIndex, newIndex).map((b) => b.id));
  };

  const renameTabMutation = useMutation({
    mutationFn: (name: string) => CharacterTabService.update(tabId, { name }),
    onSuccess: () => {
      invalidateTabs();
      setIsRenamingTab(false);
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: () => CharacterTabService.remove(tabId),
    onSuccess: () => {
      invalidateTabs();
      onTabDeleted();
    },
  });

  const handleDeleteBlock = (id: string) => {
    if (window.confirm("Excluir este bloco? Essa ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteTab = () => {
    if (
      window.confirm(
        `Excluir a aba "${tabName}" e todos os blocos dentro dela? Essa ação não pode ser desfeita.`,
      )
    ) {
      deleteTabMutation.mutate();
    }
  };

  return (
    <div className="dossier-frame glass-panel flex flex-col gap-5 px-6 py-6 sm:px-8 sm:py-7">
      <div className="flex min-h-8 items-center justify-between gap-2">
        {isRenamingTab ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tabNameDraft.trim()) renameTabMutation.mutate(tabNameDraft.trim());
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={tabNameDraft}
              onChange={(e) => setTabNameDraft(e.target.value)}
              className="h-8 w-48"
              maxLength={100}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsRenamingTab(false);
                setTabNameDraft(tabName);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={renameTabMutation.isPending}>
              {renameTabMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Salvar
            </Button>
          </form>
        ) : (
          <>
            <span className="dossier-eyebrow">{tabName}</span>
            <div className="flex items-center gap-1">
              <IconButton icon={Pencil} title="Renomear aba" onClick={() => setIsRenamingTab(true)} />
              <IconButton
                icon={Trash2}
                title="Excluir aba"
                destructive
                disabled={deleteTabMutation.isPending}
                onClick={handleDeleteTab}
              />
            </div>
          </>
        )}
      </div>

      {blocksQuery.isLoading ? (
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-5 animate-spin" />
          Carregando blocos...
        </div>
      ) : blocksQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          {extractErrorMessage(blocksQuery.error, "Não foi possível carregar os blocos.")}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {blocks.length === 0 && (
            <p className="text-muted-foreground py-10 text-center text-sm italic">
              Nenhum bloco ainda nesta aba. Use os botões abaixo pra adicionar o primeiro.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block, index) => (
                <SortableBlockCard
                  key={block.id}
                  block={block}
                  tabId={tabId}
                  characterId={characterId}
                  onNavigateToBlock={onNavigateToBlock}
                  focusBlockId={focusBlockId}
                  isFirst={index === 0}
                  isLast={index === blocks.length - 1}
                  isEditing={editingBlockId === block.id}
                  onEdit={() => setEditingBlockId(block.id)}
                  onCancelEdit={() => setEditingBlockId(null)}
                  onSubmitEdit={(values) => updateMutation.mutate({ id: block.id, values })}
                  isSaving={updateMutation.isPending}
                  onMoveUp={() => moveMutation.mutate({ id: block.id, direction: "up" })}
                  onMoveDown={() => moveMutation.mutate({ id: block.id, direction: "down" })}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onChangeAccentColor={(color) => accentColorMutation.mutate({ id: block.id, accentColor: color })}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="border-border/60 flex flex-wrap gap-1.5 border-t border-dashed pt-5">
        {Object.entries(CHARACTER_TAB_BLOCK_TYPE_LABELS).map(([value, label]) => {
          const type = Number(value) as CharacterTabBlockTypeValue;
          const Icon = BLOCK_TYPE_ICONS[type];
          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => createMutation.mutate(type)}
              disabled={createMutation.isPending}
            >
              <Icon className="size-3.5" />
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="text-muted-foreground text-xs italic">
      Bloco vazio — clique em editar pra preencher.
    </p>
  );
}

function EditFormActions({ onCancel, isSaving }: { onCancel: () => void; isSaving: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSaving}>
        {isSaving && <Loader2 className="size-4 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}

function IconButton({
  icon: Icon,
  title,
  onClick,
  disabled,
  destructive,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "text-muted-foreground rounded-sm p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30",
        destructive ? "hover:text-destructive hover:bg-destructive/10" : "hover:text-foreground hover:bg-accent/10",
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function BlockCard({
  block,
  tabId,
  characterId,
  onNavigateToBlock,
  focusBlockId,
  isFirst,
  isLast,
  isEditing,
  onEdit,
  onCancelEdit,
  onSubmitEdit,
  isSaving,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChangeAccentColor,
  dragHandleAttributes,
  dragHandleListeners,
}: {
  block: CharacterTabBlock;
  tabId: string;
  characterId: string;
  onNavigateToBlock: (blockId: string) => void;
  focusBlockId?: string | null;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (values: UpdateCharacterTabBlockRequest) => void;
  isSaving: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChangeAccentColor?: (color: BlockAccentColor | null) => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: DraggableSyntheticListeners;
}) {
  const supportsAccentColor = ACCENT_CAPABLE_TYPES.includes(block.type);

  if (isEditing) {
    const Icon = BLOCK_TYPE_ICONS[block.type];
    return (
      <div id={`block-${block.id}`} className="border-border/60 bg-card/50 border px-5 py-4">
        <div className="dossier-meta mb-3 flex items-center justify-between gap-1.5 text-[10px] tracking-widest uppercase">
          <span className="flex items-center gap-1.5">
            <Icon className="size-3.5" />
            Editando · {CHARACTER_TAB_BLOCK_TYPE_LABELS[block.type]}
          </span>
          {supportsAccentColor && onChangeAccentColor && (
            <AccentColorPicker value={block.accentColor} onChange={onChangeAccentColor} />
          )}
        </div>
        <BlockEditForm
          block={block}
          characterId={characterId}
          onSubmit={onSubmitEdit}
          onCancel={onCancelEdit}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <div id={`block-${block.id}`} className="group flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <BlockView
          block={block}
          tabId={tabId}
          characterId={characterId}
          onNavigateToBlock={onNavigateToBlock}
          focusBlockId={focusBlockId}
        />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {dragHandleAttributes && dragHandleListeners && (
          <button
            type="button"
            title="Arrastar pra reordenar"
            aria-label="Arrastar pra reordenar"
            className="text-muted-foreground hover:text-foreground hover:bg-accent/10 cursor-grab touch-none rounded-sm p-1.5 active:cursor-grabbing"
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        {supportsAccentColor && onChangeAccentColor && (
          <AccentColorPicker value={block.accentColor} onChange={onChangeAccentColor} />
        )}
        <IconButton icon={ChevronUp} title="Mover pra cima" disabled={isFirst} onClick={onMoveUp} />
        <IconButton icon={ChevronDown} title="Mover pra baixo" disabled={isLast} onClick={onMoveDown} />
        <IconButton icon={Pencil} title="Editar bloco" onClick={onEdit} />
        <IconButton icon={Trash2} title="Excluir bloco" destructive onClick={onDelete} />
      </div>
    </div>
  );
}

function SortableBlockCard(props: Omit<Parameters<typeof BlockCard>[0], "dragHandleAttributes" | "dragHandleListeners">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.block.id,
    disabled: props.isEditing,
  });

  // A block being actively edited must never carry a leftover/in-flight drag transform —
  // sortable position tracking can momentarily produce a stale offset for a block that
  // just mounted mid-edit (e.g. a freshly created child auto-opened into its edit form),
  // visually displacing the whole edit form far from where it belongs.
  const style: CSSProperties = props.isEditing
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      };

  return (
    <div ref={setNodeRef} style={style}>
      <BlockCard {...props} dragHandleAttributes={attributes} dragHandleListeners={listeners} />
    </div>
  );
}

function BlockBacklinks({
  blockId,
  onNavigateToBlock,
}: {
  blockId: string;
  onNavigateToBlock: (blockId: string) => void;
}) {
  const backlinksQuery = useQuery({
    queryKey: ["character-tab-blocks", blockId, "backlinks"],
    queryFn: () => CharacterTabBlockService.getBacklinks(blockId),
  });

  const backlinks = backlinksQuery.data ?? [];
  if (backlinks.length === 0) return null;

  return (
    <div className="border-border/60 mt-3 border-t border-dashed pt-3">
      <p className="dossier-meta mb-2 text-[10px] tracking-widest uppercase">Mencionado em</p>
      <div className="flex flex-wrap gap-1.5">
        {backlinks.map((link) => (
          <button
            key={link.blockId}
            type="button"
            onClick={() => onNavigateToBlock(link.blockId)}
            className="inline-flex items-center gap-1.5 border px-2 py-1 text-xs transition-colors"
            style={{
              color: "hsl(var(--accent))",
              borderColor: "hsl(var(--accent) / 0.4)",
              background: "hsl(var(--accent) / 0.1)",
            }}
          >
            {link.blockTitle || "Sem título"}
            <span className="dossier-meta text-[10px]">· {link.characterTabName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockView({
  block,
  tabId,
  characterId,
  onNavigateToBlock,
  focusBlockId,
}: {
  block: CharacterTabBlock;
  tabId: string;
  characterId: string;
  onNavigateToBlock: (blockId: string) => void;
  focusBlockId?: string | null;
}) {
  const uploadedImageSrc = useAuthenticatedMedia(block.imageUrl);

  switch (block.type) {
    case CharacterTabBlockType.Text:
      return block.content ? (
        <DossierMarkdown text={block.content} onNavigateToBlock={onNavigateToBlock} />
      ) : (
        <EmptyHint />
      );

    case CharacterTabBlockType.Quote:
      return block.content ? (
        <div className="dossier-quote">
          <DossierMarkdown text={block.content} onNavigateToBlock={onNavigateToBlock} />
        </div>
      ) : (
        <EmptyHint />
      );

    case CharacterTabBlockType.Card: {
      const payload = parseCardPayload(block.payloadJson);
      return (
        <div className="bg-card/40 border-border/60 border px-4 py-3" style={accentBorderStyle(block.accentColor)}>
          {block.title && (
            <div className="font-display mb-2 text-sm" style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}>
              {block.title}
            </div>
          )}
          {payload.rows.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {payload.rows.map((row, i) => (
                <div
                  key={i}
                  className="border-border/60 flex items-center justify-between border-b border-dotted py-2 last:border-b-0"
                >
                  <span className="dossier-meta text-xs">{row.k}</span>
                  <span className="font-display text-primary text-sm">{row.v}</span>
                </div>
              ))}
            </div>
          )}
          <BlockBacklinks blockId={block.id} onNavigateToBlock={onNavigateToBlock} />
        </div>
      );
    }

    case CharacterTabBlockType.Table: {
      const payload = parseTablePayload(block.payloadJson);
      return payload.headers.length === 0 ? (
        <EmptyHint />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {payload.headers.map((header, i) => (
                  <th
                    key={i}
                    className="font-display text-primary border-border/60 border-b px-2 py-1.5 text-left text-xs tracking-wide uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.rows.map((row, ri) => (
                <tr key={ri} className="border-border/60 border-b">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case CharacterTabBlockType.Image: {
      const payload = parseImagePayload(block.payloadJson);
      const imageSrc = uploadedImageSrc || payload.url;
      return imageSrc ? (
        <ImageBlockView
          block={block}
          tabId={tabId}
          characterId={characterId}
          onNavigateToBlock={onNavigateToBlock}
          focusBlockId={focusBlockId}
          imageSrc={imageSrc}
          payload={payload}
        />
      ) : (
        <EmptyHint />
      );
    }

    case CharacterTabBlockType.Divider:
      return <hr className="border-border/60" />;

    case CharacterTabBlockType.Book:
      return <BookCoverCard block={block} />;

    case CharacterTabBlockType.Collapse:
      return (
        <CollapseBlockView
          block={block}
          tabId={tabId}
          characterId={characterId}
          onNavigateToBlock={onNavigateToBlock}
          focusBlockId={focusBlockId}
        />
      );

    default:
      return null;
  }
}

const IMAGE_POSITION_ICONS: Record<ImageBlockPosition, ComponentType<{ className?: string }>> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
};

function ImageBlockFigure({
  blockId,
  tabId,
  src,
  caption,
  size,
  width,
  position,
  containerRef,
}: {
  blockId: string;
  tabId: string;
  src: string;
  caption: string;
  size: ImageBlockSize;
  width?: number;
  position: ImageBlockPosition;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | undefined>(width);
  const [syncedWidth, setSyncedWidth] = useState<number | undefined>(width);
  const dragStateRef = useRef<{ startX: number; startWidthPx: number; containerWidthPx: number } | null>(null);
  const queryClient = useQueryClient();

  if (syncedWidth !== width) {
    setSyncedWidth(width);
    setLiveWidth(width);
  }

  const updatePayloadMutation = useMutation({
    mutationFn: (patch: { width?: number; position?: ImageBlockPosition }) =>
      CharacterTabBlockService.update(blockId, {
        payloadJson: JSON.stringify({
          url: src,
          caption,
          size,
          width: patch.width ?? liveWidth,
          position: patch.position ?? position,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["character-tabs", tabId, "blocks"] }),
  });

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = containerRef.current;
    const figure = event.currentTarget.closest("figure");
    if (!container || !figure) return;

    dragStateRef.current = {
      startX: event.clientX,
      startWidthPx: figure.getBoundingClientRect().width,
      containerWidthPx: container.getBoundingClientRect().width,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const deltaPx = event.clientX - dragState.startX;
    const nextWidthPx = dragState.startWidthPx + deltaPx;
    const nextPercent = (nextWidthPx / dragState.containerWidthPx) * 100;
    setLiveWidth(Math.round(Math.min(CUSTOM_WIDTH_MAX, Math.max(CUSTOM_WIDTH_MIN, nextPercent))));
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (liveWidth !== undefined && liveWidth !== width) {
      updatePayloadMutation.mutate({ width: liveWidth });
    }
  };

  // Side-by-side layouts always need an explicit width on the figure: relying on max-width
  // alone leaves it at `width: auto` inside the flex row, whose resolved size depends on the
  // source image's own intrinsic dimensions and can end up wildly wrong (e.g. a tall portrait
  // photo claiming far more flex-basis than its rendered max-width suggests, starving the
  // sibling text column of space). Centered mode has no sibling column to starve, so it's
  // fine to keep using the max-width presets there.
  const effectiveWidth = liveWidth ?? (position !== "center" ? SIDE_BY_SIDE_DEFAULT_WIDTH : undefined);
  const figureStyle: CSSProperties | undefined =
    effectiveWidth !== undefined ? { width: `${effectiveWidth}%` } : undefined;

  return (
    <>
      <figure
        className={cn(
          "border-border/60 bg-background/40 group/image relative border p-2",
          position === "center" ? "mx-auto" : "sm:shrink-0",
          effectiveWidth === undefined && IMAGE_BLOCK_SIZE_CLASSES[size],
        )}
        style={figureStyle}
      >
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="block w-full cursor-zoom-in"
          title="Ver em tela cheia"
        >
          <img src={src} alt={caption || "Imagem"} className="w-full object-cover" />
        </button>
        {caption && (
          <figcaption className="dossier-meta pt-2 text-center text-[10px] tracking-widest uppercase">
            {caption}
          </figcaption>
        )}
        <div className="absolute top-1 left-1 flex gap-0.5 opacity-0 transition-opacity group-hover/image:opacity-100">
          {IMAGE_BLOCK_POSITIONS.map((option) => {
            const Icon = IMAGE_POSITION_ICONS[option];
            return (
              <button
                key={option}
                type="button"
                title={`Alinhar à ${IMAGE_BLOCK_POSITION_LABELS[option].toLowerCase()}`}
                onClick={() => updatePayloadMutation.mutate({ position: option })}
                className={cn(
                  "border-border/60 bg-card rounded-sm border p-1",
                  position === option ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3" />
              </button>
            );
          })}
        </div>
        <div
          role="slider"
          aria-label="Redimensionar imagem"
          aria-valuemin={CUSTOM_WIDTH_MIN}
          aria-valuemax={CUSTOM_WIDTH_MAX}
          aria-valuenow={effectiveWidth ?? 100}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          className="border-border/60 bg-card absolute right-0 bottom-0 size-3.5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize touch-none rounded-full border opacity-0 transition-opacity group-hover/image:opacity-100"
          style={{ touchAction: "none" }}
        />
      </figure>
      {isLightboxOpen && (
        <ImageLightbox src={src} alt={caption || "Imagem"} onClose={() => setIsLightboxOpen(false)} />
      )}
    </>
  );
}

function useChildBlockMutations(tabId: string, parentBlockId: string, children: CharacterTabBlock[]) {
  const queryClient = useQueryClient();
  const blocksQueryKey = ["character-tabs", tabId, "blocks"];
  const invalidateBlocks = () => queryClient.invalidateQueries({ queryKey: blocksQueryKey });

  const createChildMutation = useMutation({
    mutationFn: (type: CharacterTabBlockTypeValue) =>
      CharacterTabBlockService.createChild(parentBlockId, { type, ...defaultsForType(type) }),
    onSuccess: () => invalidateBlocks(),
  });

  const updateChildMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateCharacterTabBlockRequest }) =>
      CharacterTabBlockService.update(id, values),
    onSuccess: () => invalidateBlocks(),
  });

  const moveChildMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) =>
      CharacterTabBlockService.move(id, direction),
    onSuccess: () => invalidateBlocks(),
  });

  const deleteChildMutation = useMutation({
    mutationFn: (id: string) => CharacterTabBlockService.remove(id),
    onSuccess: () => invalidateBlocks(),
  });

  const accentChildMutation = useMutation({
    mutationFn: ({ id, accentColor }: { id: string; accentColor: BlockAccentColor | null }) =>
      CharacterTabBlockService.updateAccentColor(id, accentColor),
    onSuccess: () => invalidateBlocks(),
  });

  const reorderChildrenMutation = useMutation({
    mutationFn: (orderedIds: string[]) => CharacterTabBlockService.reorderChildren(parentBlockId, orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: blocksQueryKey });
      const previous = queryClient.getQueryData<CharacterTabBlock[]>(blocksQueryKey);
      if (previous) {
        const byId = new Map(children.map((c) => [c.id, c]));
        queryClient.setQueryData<CharacterTabBlock[]>(
          blocksQueryKey,
          previous.map((b) =>
            b.id === parentBlockId
              ? { ...b, children: orderedIds.map((id, i) => ({ ...byId.get(id)!, order: i })) }
              : b,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(blocksQueryKey, context.previous);
    },
    onSettled: () => invalidateBlocks(),
  });

  return {
    createChildMutation,
    updateChildMutation,
    moveChildMutation,
    deleteChildMutation,
    accentChildMutation,
    reorderChildrenMutation,
  };
}

const IMAGE_CHILD_BLOCK_TYPE_ENTRIES = Object.entries(CHARACTER_TAB_BLOCK_TYPE_LABELS).filter(
  ([value]) =>
    Number(value) !== CharacterTabBlockType.Collapse && Number(value) !== CharacterTabBlockType.Image,
);

function ImageBlockView({
  block,
  tabId,
  characterId,
  onNavigateToBlock,
  focusBlockId,
  imageSrc,
  payload,
}: {
  block: CharacterTabBlock;
  tabId: string;
  characterId: string;
  onNavigateToBlock: (blockId: string) => void;
  focusBlockId?: string | null;
  imageSrc: string;
  payload: ImageBlockPayload;
}) {
  const children = block.children;
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    createChildMutation,
    updateChildMutation,
    moveChildMutation,
    deleteChildMutation,
    accentChildMutation,
    reorderChildrenMutation,
  } = useChildBlockMutations(tabId, block.id, children);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = children.findIndex((c) => c.id === active.id);
    const newIndex = children.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderChildrenMutation.mutate(arrayMove(children, oldIndex, newIndex).map((c) => c.id));
  };

  const handleDeleteChild = (id: string) => {
    if (window.confirm("Excluir este bloco? Essa ação não pode ser desfeita.")) {
      deleteChildMutation.mutate(id);
    }
  };

  const isSideBySide = payload.position !== "center";

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex w-full flex-col gap-4",
        isSideBySide && "sm:flex-row sm:items-start",
        payload.position === "right" && "sm:flex-row-reverse",
      )}
    >
      <ImageBlockFigure
        blockId={block.id}
        tabId={tabId}
        src={imageSrc}
        caption={payload.caption}
        size={payload.size}
        width={payload.width}
        position={payload.position}
        containerRef={containerRef}
      />
      <div className={cn("min-w-0 space-y-3", isSideBySide && "flex-1")}>
        {children.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
            <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {children.map((child, index) => (
                <SortableBlockCard
                  key={child.id}
                  block={child}
                  tabId={tabId}
                  characterId={characterId}
                  onNavigateToBlock={onNavigateToBlock}
                  focusBlockId={focusBlockId}
                  isFirst={index === 0}
                  isLast={index === children.length - 1}
                  isEditing={editingChildId === child.id}
                  onEdit={() => setEditingChildId(child.id)}
                  onCancelEdit={() => setEditingChildId(null)}
                  onSubmitEdit={(values) =>
                    updateChildMutation.mutate(
                      { id: child.id, values },
                      { onSuccess: () => setEditingChildId(null) },
                    )
                  }
                  isSaving={updateChildMutation.isPending}
                  onMoveUp={() => moveChildMutation.mutate({ id: child.id, direction: "up" })}
                  onMoveDown={() => moveChildMutation.mutate({ id: child.id, direction: "down" })}
                  onDelete={() => handleDeleteChild(child.id)}
                  onChangeAccentColor={(color) => accentChildMutation.mutate({ id: child.id, accentColor: color })}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
        <div className="flex flex-wrap gap-1">
          {IMAGE_CHILD_BLOCK_TYPE_ENTRIES.map(([value, label]) => {
            const type = Number(value) as CharacterTabBlockTypeValue;
            const Icon = BLOCK_TYPE_ICONS[type];
            return (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                onClick={() =>
                  createChildMutation.mutate(type, { onSuccess: (created) => setEditingChildId(created.id) })
                }
                disabled={createChildMutation.isPending}
              >
                <Icon className="size-3" />
                {label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BookCoverCard({ block }: { block: CharacterTabBlock }) {
  const [readerOpen, setReaderOpen] = useState(false);

  const volumesQuery = useQuery({
    queryKey: ["book-volumes", block.id],
    queryFn: () => BookVolumeService.getAllByBlock(block.id),
  });

  const volumeCount = volumesQuery.data?.length ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setReaderOpen(true)}
        className="bg-card/40 border-border/60 hover:bg-card/60 flex w-full items-center gap-4 border px-4 py-3 text-left transition-colors"
        style={accentBorderStyle(block.accentColor)}
      >
        <BookOpen className="text-primary size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <div
            className="font-display truncate text-base"
            style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
          >
            {block.title || "Livro sem título"}
          </div>
          <div className="dossier-meta text-xs">
            {volumeCount === 0
              ? "Sem páginas ainda"
              : `${volumeCount} ${volumeCount === 1 ? "volume" : "volumes"}`}
          </div>
        </div>
      </button>
      {readerOpen && (
        <BookReaderDialog
          characterTabBlockId={block.id}
          title={block.title ?? "Livro"}
          onClose={() => setReaderOpen(false)}
        />
      )}
    </>
  );
}

const CHILD_BLOCK_TYPE_ENTRIES = Object.entries(CHARACTER_TAB_BLOCK_TYPE_LABELS).filter(
  ([value]) => Number(value) !== CharacterTabBlockType.Collapse,
);

function CollapseBlockView({
  block,
  tabId,
  characterId,
  onNavigateToBlock,
  focusBlockId,
}: {
  block: CharacterTabBlock;
  tabId: string;
  characterId: string;
  onNavigateToBlock: (blockId: string) => void;
  focusBlockId?: string | null;
}) {
  const children = block.children;

  // Collapses default closed, but a link/backlink pointing at this record (or a card
  // nested inside it) needs it expanded to actually be visible when navigated to — the
  // common case is a fresh mount (switching tabs), so check this up front too, not just
  // reactively, so it opens on the very first paint instead of a flash-then-open.
  const isFocusTarget = (id?: string | null) =>
    Boolean(id) && (id === block.id || children.some((c) => c.id === id));
  const [open, setOpen] = useState(() => isFocusTarget(focusBlockId));
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [isThumbnailLightboxOpen, setIsThumbnailLightboxOpen] = useState(false);
  const thumbnailUrl = useAuthenticatedMedia(block.imageUrl);

  // Re-derive `open` when focusBlockId changes to point at this (already-mounted)
  // record — the render-time "adjust state during render" pattern, not an effect,
  // since this only needs to react to a prop change, not synchronize with anything
  // external. See https://react.dev/learn/you-might-not-need-an-effect
  const [lastFocusBlockId, setLastFocusBlockId] = useState(focusBlockId);
  if (focusBlockId !== lastFocusBlockId) {
    setLastFocusBlockId(focusBlockId);
    if (isFocusTarget(focusBlockId)) setOpen(true);
  }

  const {
    createChildMutation,
    updateChildMutation,
    moveChildMutation,
    deleteChildMutation,
    accentChildMutation,
    reorderChildrenMutation,
  } = useChildBlockMutations(tabId, block.id, children);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = children.findIndex((c) => c.id === active.id);
    const newIndex = children.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderChildrenMutation.mutate(arrayMove(children, oldIndex, newIndex).map((c) => c.id));
  };

  const handleDeleteChild = (id: string) => {
    if (window.confirm("Excluir este bloco? Essa ação não pode ser desfeita.")) {
      deleteChildMutation.mutate(id);
    }
  };

  return (
    <>
      <div className="bg-card/40 border-border/60 border px-4 py-3" style={accentBorderStyle(block.accentColor)}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            {thumbnailUrl && (
              <span
                role="button"
                tabIndex={0}
                title="Ver em tela cheia"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsThumbnailLightboxOpen(true);
                }}
                className="cursor-zoom-in"
              >
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="border-border/60 size-16 shrink-0 rounded-sm border object-cover"
                />
              </span>
            )}
            <div className="min-w-0">
              <div
                className="font-display truncate text-base"
                style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
              >
                {block.title || "Sem título"}
              </div>
              {block.meta && <div className="dossier-meta text-xs">{block.meta}</div>}
            </div>
          </div>
          <span
            className={cn("text-muted-foreground shrink-0 text-xs transition-transform", open && "rotate-180")}
          >
            ▾
          </span>
        </button>
        {open && (
          <div className="border-border/60 mt-3 flex flex-col gap-4 border-t pt-3">
            {block.content ? (
              <DossierMarkdown text={block.content} onNavigateToBlock={onNavigateToBlock} />
            ) : (
              <EmptyHint />
            )}

            {children.length > 0 && (
              <div className="border-border/60 flex flex-col gap-3 border-t border-dashed pt-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
                  <SortableContext items={children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    {children.map((child, index) => (
                      <SortableBlockCard
                        key={child.id}
                        block={child}
                        tabId={tabId}
                        characterId={characterId}
                        onNavigateToBlock={onNavigateToBlock}
                        focusBlockId={focusBlockId}
                        isFirst={index === 0}
                        isLast={index === children.length - 1}
                        isEditing={editingChildId === child.id}
                        onEdit={() => setEditingChildId(child.id)}
                        onCancelEdit={() => setEditingChildId(null)}
                        onSubmitEdit={(values) =>
                    updateChildMutation.mutate(
                      { id: child.id, values },
                      { onSuccess: () => setEditingChildId(null) },
                    )
                  }
                        isSaving={updateChildMutation.isPending}
                        onMoveUp={() => moveChildMutation.mutate({ id: child.id, direction: "up" })}
                        onMoveDown={() => moveChildMutation.mutate({ id: child.id, direction: "down" })}
                        onDelete={() => handleDeleteChild(child.id)}
                        onChangeAccentColor={(color) => accentChildMutation.mutate({ id: child.id, accentColor: color })}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <div className="border-border/60 flex flex-wrap gap-1 border-t border-dashed pt-3">
              {CHILD_BLOCK_TYPE_ENTRIES.map(([value, label]) => {
                const type = Number(value) as CharacterTabBlockTypeValue;
                const Icon = BLOCK_TYPE_ICONS[type];
                return (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                    onClick={() =>
                      createChildMutation.mutate(type, { onSuccess: (created) => setEditingChildId(created.id) })
                    }
                    disabled={createChildMutation.isPending}
                  >
                    <Icon className="size-3" />
                    {label}
                  </Button>
                );
              })}
            </div>

            <BlockBacklinks blockId={block.id} onNavigateToBlock={onNavigateToBlock} />
          </div>
        )}
      </div>
      {isThumbnailLightboxOpen && thumbnailUrl && (
        <ImageLightbox src={thumbnailUrl} alt={block.title ?? ""} onClose={() => setIsThumbnailLightboxOpen(false)} />
      )}
    </>
  );
}

function BlockEditForm({
  block,
  characterId,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  characterId: string;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  switch (block.type) {
    case CharacterTabBlockType.Text:
    case CharacterTabBlockType.Quote:
      return (
        <TextLikeEditForm
          block={block}
          characterId={characterId}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSaving={isSaving}
        />
      );
    case CharacterTabBlockType.Card:
      return <CardEditForm block={block} onSubmit={onSubmit} onCancel={onCancel} isSaving={isSaving} />;
    case CharacterTabBlockType.Table:
      return <TableEditForm block={block} onSubmit={onSubmit} onCancel={onCancel} isSaving={isSaving} />;
    case CharacterTabBlockType.Image:
      return <ImageEditForm block={block} onSubmit={onSubmit} onCancel={onCancel} isSaving={isSaving} />;
    case CharacterTabBlockType.Divider:
      return <DividerEditForm onSubmit={onSubmit} onCancel={onCancel} isSaving={isSaving} />;
    case CharacterTabBlockType.Book:
      return <BookEditForm block={block} onSubmit={onSubmit} onCancel={onCancel} isSaving={isSaving} />;
    case CharacterTabBlockType.Collapse:
      return (
        <CollapseEditForm
          block={block}
          characterId={characterId}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isSaving={isSaving}
        />
      );
    default:
      return null;
  }
}

function TextLikeEditForm({
  block,
  characterId,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  characterId: string;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [content, setContent] = useState(block.content ?? "");
  const isQuote = block.type === CharacterTabBlockType.Quote;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    setContent((current) => {
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const next = current.slice(0, start) + snippet + current.slice(end);
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + snippet.length;
        el?.setSelectionRange(pos, pos);
      });
      return next;
    });
  };

  const mention = useMentionAutocomplete({
    characterId,
    excludeBlockId: block.id,
    textareaRef,
    onChange: setContent,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ content });
      }}
      className="space-y-3"
    >
      <div className="flex justify-end">
        <BlockLinkPicker characterId={characterId} excludeBlockId={block.id} onInsert={insertAtCursor} />
      </div>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            mention.handleChange();
          }}
          onKeyDown={mention.handleKeyDown}
          onKeyUp={mention.handleSelectionChange}
          onClick={mention.handleSelectionChange}
          rows={isQuote ? 3 : 6}
          placeholder={
            isQuote ? "Uma citação marcante..." : "Escreva aqui... (aceita Markdown, digite @ pra vincular)"
          }
        />
        {mention.isOpen && (
          <MentionDropdown
            position={mention.position}
            options={mention.options}
            activeIndex={mention.activeIndex}
            isLoading={mention.isLoading}
            onSelect={mention.select}
            onHoverIndex={mention.setActiveIndex}
          />
        )}
      </div>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}

function CardEditForm({
  block,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(block.title ?? "");
  const [rows, setRows] = useState(parseCardPayload(block.payloadJson).rows);

  const updateRow = (index: number, field: "k" | "v", value: string) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const addRow = () => setRows((prev) => [...prev, { k: "", v: "" }]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, payloadJson: JSON.stringify({ rows }) });
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label className="text-xs">Título do card</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Atributos" />
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="w-32"
              value={row.k}
              onChange={(e) => updateRow(i, "k", e.target.value)}
              placeholder="Chave"
            />
            <Input
              className="flex-1"
              value={row.v}
              onChange={(e) => updateRow(i, "v", e.target.value)}
              placeholder="Valor"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addRow}>
          <Plus className="size-3.5" />
          Linha
        </Button>
      </div>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}

function TableEditForm({
  block,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [payload, setPayload] = useState(parseTablePayload(block.payloadJson));

  const updateHeader = (index: number, value: string) =>
    setPayload((p) => ({ ...p, headers: p.headers.map((h, i) => (i === index ? value : h)) }));
  const updateCell = (rowIndex: number, cellIndex: number, value: string) =>
    setPayload((p) => ({
      ...p,
      rows: p.rows.map((row, r) => (r === rowIndex ? row.map((c, i) => (i === cellIndex ? value : c)) : row)),
    }));
  const addColumn = () =>
    setPayload((p) => ({ headers: [...p.headers, "Nova coluna"], rows: p.rows.map((r) => [...r, ""]) }));
  const removeColumn = (index: number) =>
    setPayload((p) => ({
      headers: p.headers.filter((_, i) => i !== index),
      rows: p.rows.map((r) => r.filter((_, i) => i !== index)),
    }));
  const addRow = () => setPayload((p) => ({ ...p, rows: [...p.rows, p.headers.map(() => "")] }));
  const removeRow = (index: number) =>
    setPayload((p) => ({ ...p, rows: p.rows.filter((_, i) => i !== index) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ payloadJson: JSON.stringify(payload) });
      }}
      className="space-y-3"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {payload.headers.map((header, i) => (
                <th key={i} className="border-border/60 border-b px-1 py-1">
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-7 text-xs"
                      value={header}
                      onChange={(e) => updateHeader(i, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-8">
                <button
                  type="button"
                  onClick={addColumn}
                  className="text-muted-foreground hover:text-foreground"
                  title="Nova coluna"
                >
                  <Plus className="size-3.5" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="border-border/60 border-b px-1 py-1">
                    <Input
                      className="h-7 text-xs"
                      value={cell}
                      onChange={(e) => updateCell(ri, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border-border/60 border-b">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Excluir linha"
                  >
                    <X className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={addRow}>
        <Plus className="size-3.5" />
        Linha
      </Button>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}

function ImageEditForm({
  block,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const initial = parseImagePayload(block.payloadJson);
  const [url, setUrl] = useState(initial.url);
  const [caption, setCaption] = useState(initial.caption);
  const [size, setSize] = useState<ImageBlockSize>(initial.size);
  const [width, setWidth] = useState<number | undefined>(initial.width);
  const [position, setPosition] = useState<ImageBlockPosition>(initial.position);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const uploadedImageSrc = useAuthenticatedMedia(block.imageUrl);

  const invalidateBlocks = () =>
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "character-tabs" && query.queryKey[2] === "blocks",
    });

  const uploadMutation = useMutation({
    mutationFn: (blob: Blob) => CharacterTabBlockService.uploadImage(block.id, blob),
    onSuccess: () => invalidateBlocks(),
  });

  const removeMutation = useMutation({
    mutationFn: () => CharacterTabBlockService.removeImage(block.id),
    onSuccess: () => invalidateBlocks(),
  });

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const blob = await resizeImageToBlob(file);
    uploadMutation.mutate(blob);
  };

  const isProcessing = uploadMutation.isPending || removeMutation.isPending;
  const previewSrc = uploadedImageSrc || url;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ payloadJson: JSON.stringify({ url, caption, size, width, position }) });
      }}
      className="space-y-3"
    >
      {previewSrc && (
        <img
          src={previewSrc}
          alt="Pré-visualização"
          className={cn("border-border/60 mx-auto border object-contain", width === undefined && IMAGE_BLOCK_SIZE_CLASSES[size])}
          style={width !== undefined ? { width: `${width}%` } : undefined}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
          Enviar arquivo
        </Button>
        {block.imageUrl && (
          <Button type="button" variant="ghost" size="sm" onClick={() => removeMutation.mutate()} disabled={isProcessing}>
            Remover imagem enviada
          </Button>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Ou link de imagem externa</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Legenda (opcional)</Label>
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda da imagem" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tamanho</Label>
        <Select
          value={size}
          onChange={(e) => {
            setSize(e.target.value as ImageBlockSize);
            setWidth(undefined);
          }}
        >
          {IMAGE_BLOCK_SIZES.map((option) => (
            <option key={option} value={option}>
              {IMAGE_BLOCK_SIZE_LABELS[option]}
            </option>
          ))}
        </Select>
        {width !== undefined && (
          <p className="text-muted-foreground text-[11px]">
            Largura customizada em {width}% (arrastada na visualização do bloco). Escolher um tamanho aqui volta ao padrão.
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Alinhamento</Label>
        <div className="flex gap-1">
          {IMAGE_BLOCK_POSITIONS.map((option) => {
            const Icon = IMAGE_POSITION_ICONS[option];
            return (
              <Button
                key={option}
                type="button"
                variant={position === option ? "outline" : "ghost"}
                size="sm"
                onClick={() => setPosition(option)}
              >
                <Icon className="size-3.5" />
                {IMAGE_BLOCK_POSITION_LABELS[option]}
              </Button>
            );
          })}
        </div>
        {position !== "center" && (
          <p className="text-muted-foreground text-[11px]">
            Com alinhamento à {IMAGE_BLOCK_POSITION_LABELS[position].toLowerCase()}, blocos adicionados dentro
            deste bloco de imagem (veja a visualização) aparecem ao lado dela.
          </p>
        )}
      </div>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}

function DividerEditForm({
  onSubmit,
  onCancel,
  isSaving,
}: {
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({});
      }}
      className="space-y-3"
    >
      <p className="text-muted-foreground text-xs italic">
        Divisor não tem conteúdo pra editar — use os botões de mover/excluir.
      </p>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}

function BookEditForm({
  block,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(block.title ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title });
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label className="text-xs">Título do livro</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Tomo de Segredos" />
      </div>
      <p className="text-muted-foreground text-xs italic">
        As páginas (PDFs) são gerenciadas dentro do próprio leitor do livro, não aqui.
      </p>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}

function CollapseEditForm({
  block,
  characterId,
  onSubmit,
  onCancel,
  isSaving,
}: {
  block: CharacterTabBlock;
  characterId: string;
  onSubmit: (values: UpdateCharacterTabBlockRequest) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState(block.title ?? "");
  const [meta, setMeta] = useState(block.meta ?? "");
  const [content, setContent] = useState(block.content ?? "");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const thumbnailUrl = useAuthenticatedMedia(block.imageUrl);

  const invalidateBlocks = () =>
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "character-tabs" && query.queryKey[2] === "blocks",
    });

  const uploadThumbnailMutation = useMutation({
    mutationFn: (blob: Blob) => CharacterTabBlockService.uploadImage(block.id, blob),
    onSuccess: () => invalidateBlocks(),
  });

  const removeThumbnailMutation = useMutation({
    mutationFn: () => CharacterTabBlockService.removeImage(block.id),
    onSuccess: () => invalidateBlocks(),
  });

  const isProcessingThumbnail = uploadThumbnailMutation.isPending || removeThumbnailMutation.isPending;

  const insertAtCursor = (snippet: string) => {
    const el = contentTextareaRef.current;
    setContent((current) => {
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const next = current.slice(0, start) + snippet + current.slice(end);
      requestAnimationFrame(() => {
        el?.focus();
        const pos = start + snippet.length;
        el?.setSelectionRange(pos, pos);
      });
      return next;
    });
  };

  const handleThumbnailFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const blob = await resizeImageToBlob(file, 160);
    uploadThumbnailMutation.mutate(blob);
  };

  const mention = useMentionAutocomplete({
    characterId,
    excludeBlockId: block.id,
    textareaRef: contentTextareaRef,
    onChange: setContent,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, meta: meta || null, content });
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label className="text-xs">Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Nome do NPC" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Subtítulo (opcional)</Label>
        <Input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="Ex.: status, data, tipo..." />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Miniatura (opcional, aparece no início do registro)</Label>
        <div className="flex flex-wrap items-center gap-2">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Pré-visualização"
              className="border-border/60 size-16 shrink-0 rounded-sm border object-cover"
            />
          )}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={isProcessingThumbnail}
          >
            {isProcessingThumbnail ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
            Enviar imagem
          </Button>
          {block.imageUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeThumbnailMutation.mutate()}
              disabled={isProcessingThumbnail}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Conteúdo</Label>
          <BlockLinkPicker characterId={characterId} excludeBlockId={block.id} onInsert={insertAtCursor} />
        </div>
        <div className="relative">
          <Textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              mention.handleChange();
            }}
            onKeyDown={mention.handleKeyDown}
            onKeyUp={mention.handleSelectionChange}
            onClick={mention.handleSelectionChange}
            rows={6}
            placeholder="Escreva aqui... (aceita Markdown, digite @ pra vincular)"
          />
          {mention.isOpen && (
            <MentionDropdown
              position={mention.position}
              options={mention.options}
              activeIndex={mention.activeIndex}
              isLoading={mention.isLoading}
              onSelect={mention.select}
              onHoverIndex={mention.setActiveIndex}
            />
          )}
        </div>
      </div>
      <EditFormActions onCancel={onCancel} isSaving={isSaving} />
    </form>
  );
}
