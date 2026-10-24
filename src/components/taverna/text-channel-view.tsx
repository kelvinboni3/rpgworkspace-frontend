import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Loader2, Megaphone, Pencil, RotateCcw, SendHorizontal, Trash2, X } from "lucide-react";
import { ChatMarkdown } from "@/components/taverna/chat-markdown";
import { patchMessage, removeMessage, upsertMessage } from "@/components/taverna/message-cache";
import { TavernaAvatar } from "@/components/taverna/taverna-avatar";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaMembers } from "@/hooks/use-taverna-data";
import {
  CommunityService,
  MESSAGE_MAX_LENGTH,
  MESSAGES_PAGE_SIZE,
  communityKeys,
  type CommunityChannel,
  type CommunityMessage,
} from "@/services/community-service";
import { extractErrorMessage } from "@/utils/api-error";
import { cn } from "@/utils/cn";

const GROUP_WINDOW_MS = 7 * 60 * 1000;
const NEAR_BOTTOM_PX = 120;

const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `Hoje às ${timeFormat.format(date)}`;
  if (date.toDateString() === yesterday.toDateString()) return `Ontem às ${timeFormat.format(date)}`;
  return `${date.toLocaleDateString("pt-BR")} ${timeFormat.format(date)}`;
}

export function TextChannelView({ channel }: { channel: CommunityChannel }) {
  const queryClient = useQueryClient();
  const { me, isAdmin, typing, sendTyping, setActiveTextChannel } = useTaverna();
  const { nameById } = useTavernaMembers();
  const myId = me ? me.userId : "";

  const messagesQuery = useInfiniteQuery({
    queryKey: communityKeys.messages(channel.id),
    queryFn: ({ pageParam }) => CommunityService.getMessages(channel.id, pageParam),
    initialPageParam: undefined as string | undefined,
    // A próxima "página" é a mais antiga: cursor = primeira mensagem (mais velha) da última página.
    getNextPageParam: (lastPage) =>
      lastPage.length < MESSAGES_PAGE_SIZE ? undefined : lastPage[0]?.id,
    // O hub mantém o cache em dia; refetch só em reconexão (ver TavernaProvider).
    staleTime: Infinity,
  });

  const messages = useMemo(
    () => [...(messagesQuery.data?.pages ?? [])].reverse().flat(),
    [messagesQuery.data],
  );

  // ── Canal ativo / não lidas ───────────────────────────────────────────────
  useEffect(() => {
    setActiveTextChannel(channel.id);
    const handleVisibility = () => {
      if (!document.hidden) setActiveTextChannel(channel.id);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      setActiveTextChannel(null);
    };
  }, [channel.id, setActiveTextChannel]);

  // ── Scroll: gruda no fim quando chega mensagem, preserva posição ao carregar antigas ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prependAnchorRef = useRef<number | null>(null);
  const lastMessageId = messages.at(-1)?.id;

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (prependAnchorRef.current !== null) {
      element.scrollTop = element.scrollHeight - prependAnchorRef.current;
      prependAnchorRef.current = null;
      return;
    }
    if (stickToBottomRef.current) element.scrollTop = element.scrollHeight;
  }, [messages.length, lastMessageId]);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [channel.id]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = messagesQuery;
  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    if (element.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      prependAnchorRef.current = element.scrollHeight - element.scrollTop;
      void fetchNextPage();
    }
  };

  // ── Envio (otimista, com nonce para não duplicar) ────────────────────────
  const [sendError, setSendError] = useState<string | null>(null);

  const sendContent = useCallback(
    async (content: string) => {
      if (!me) return;
      const nonce = crypto.randomUUID();
      const optimistic: CommunityMessage = {
        id: `pending-${nonce}`,
        channelId: channel.id,
        authorId: me.userId,
        authorName: me.displayName,
        content,
        createdAt: new Date().toISOString(),
        editedAt: null,
        clientNonce: nonce,
        pending: true,
      };
      stickToBottomRef.current = true;
      setSendError(null);
      upsertMessage(queryClient, optimistic);
      try {
        const saved = await CommunityService.sendMessage(channel.id, content, nonce);
        upsertMessage(queryClient, saved);
      } catch (error) {
        patchMessage(queryClient, channel.id, optimistic.id, { pending: false, failed: true });
        setSendError(extractErrorMessage(error, "Não foi possível enviar a mensagem."));
      }
    },
    [channel.id, me, queryClient],
  );

  const retry = (message: CommunityMessage) => {
    removeMessage(queryClient, channel.id, message.id);
    void sendContent(message.content);
  };

  // ── Edição / exclusão ─────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const saveEdit = async (message: CommunityMessage, content: string) => {
    const trimmed = content.trim();
    setEditingId(null);
    if (!trimmed || trimmed === message.content) return;
    patchMessage(queryClient, channel.id, message.id, { content: trimmed, editedAt: new Date().toISOString() });
    try {
      const saved = await CommunityService.editMessage(message.id, trimmed);
      patchMessage(queryClient, channel.id, message.id, { content: saved.content, editedAt: saved.editedAt });
    } catch (error) {
      patchMessage(queryClient, channel.id, message.id, { content: message.content, editedAt: message.editedAt });
      setSendError(extractErrorMessage(error, "Não foi possível editar a mensagem."));
    }
  };

  const deleteMessage = async (message: CommunityMessage) => {
    setConfirmDeleteId(null);
    if (message.failed) {
      removeMessage(queryClient, channel.id, message.id);
      return;
    }
    try {
      await CommunityService.deleteMessage(message.id);
      removeMessage(queryClient, channel.id, message.id);
    } catch (error) {
      setSendError(extractErrorMessage(error, "Não foi possível apagar a mensagem."));
    }
  };

  const editLastOwnMessage = () => {
    const last = [...messages].reverse().find((m) => m.authorId === myId && !m.pending && !m.failed);
    if (last) setEditingId(last.id);
  };

  const canWrite = !channel.isReadOnly || isAdmin;
  const typingNames = (typing[channel.id] ?? []).map((id) => nameById.get(id) ?? "Alguém");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border/60 flex h-12 shrink-0 items-center gap-2 border-b px-4">
        {channel.isReadOnly ? (
          <Megaphone className="text-muted-foreground size-5" />
        ) : (
          <Hash className="text-muted-foreground size-5" />
        )}
        <h1 className="font-semibold">{channel.name}</h1>
        {channel.topic && (
          <>
            <span className="bg-border h-5 w-px" />
            <p className="text-muted-foreground truncate text-sm">{channel.topic}</p>
          </>
        )}
      </header>

      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto py-4">
        {messagesQuery.isPending ? (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : messagesQuery.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm">
            <p className="text-destructive">Não foi possível carregar as mensagens.</p>
            <button type="button" className="text-primary underline" onClick={() => void messagesQuery.refetch()}>
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {hasNextPage ? (
              <div className="text-muted-foreground flex justify-center py-2">
                {isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
              </div>
            ) : (
              <div className="px-4 pb-4">
                <div className="bg-primary/15 text-primary mb-3 flex size-14 items-center justify-center rounded-full">
                  <Hash className="size-7" />
                </div>
                <h2 className="font-display text-2xl font-bold">Bem-vindo a #{channel.name}!</h2>
                <p className="text-muted-foreground text-sm">Este é o começo do canal #{channel.name}.</p>
              </div>
            )}

            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay =
                !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              const grouped =
                !newDay &&
                previous?.authorId === message.authorId &&
                new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW_MS;

              return (
                <div key={message.id}>
                  {newDay && (
                    <div className="text-muted-foreground my-3 flex items-center gap-3 px-4 text-[11px] font-semibold">
                      <span className="bg-border h-px flex-1" />
                      {dayFormat.format(new Date(message.createdAt))}
                      <span className="bg-border h-px flex-1" />
                    </div>
                  )}
                  <MessageRow
                    message={message}
                    grouped={grouped}
                    isMine={message.authorId === myId}
                    canDelete={message.authorId === myId || isAdmin}
                    isEditing={editingId === message.id}
                    isConfirmingDelete={confirmDeleteId === message.id}
                    onStartEdit={() => setEditingId(message.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSaveEdit={(content) => void saveEdit(message, content)}
                    onAskDelete={() => setConfirmDeleteId(message.id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onConfirmDelete={() => void deleteMessage(message)}
                    onRetry={() => retry(message)}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4">
        {sendError && (
          <div className="text-destructive mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span>{sendError}</span>
            <button type="button" onClick={() => setSendError(null)} aria-label="Fechar aviso">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {canWrite ? (
          <Composer
            key={channel.id}
            placeholder={`Conversar em #${channel.name}`}
            onSend={(content) => void sendContent(content)}
            onTyping={() => sendTyping(channel.id)}
            onEditLast={editLastOwnMessage}
          />
        ) : (
          <div className="bg-card/50 text-muted-foreground rounded-lg border px-4 py-3 text-sm">
            Só administradores podem enviar mensagens neste canal.
          </div>
        )}
        <div className="text-muted-foreground h-5 pt-1 text-xs">
          {typingNames.length > 0 && (
            <span className="animate-pulse">
              {typingNames.length === 1
                ? `${typingNames[0]} está digitando...`
                : typingNames.length <= 3
                  ? `${typingNames.join(", ")} estão digitando...`
                  : "Várias pessoas estão digitando..."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

type MessageRowProps = {
  message: CommunityMessage;
  grouped: boolean;
  isMine: boolean;
  canDelete: boolean;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (content: string) => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRetry: () => void;
};

function MessageRow({
  message,
  grouped,
  isMine,
  canDelete,
  isEditing,
  isConfirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onRetry,
}: MessageRowProps) {
  const showActions = !isEditing && !message.pending;

  return (
    <div
      className={cn(
        "group hover:bg-accent/5 relative flex gap-3 px-4",
        grouped ? "py-0.5" : "mt-3 py-0.5",
        isMine && "border-primary/0 hover:border-primary/40 border-l-2",
      )}
    >
      <div className="w-10 shrink-0">
        {grouped ? (
          <span className="text-muted-foreground hidden pt-1 text-[10px] group-hover:block">
            {timeFormat.format(new Date(message.createdAt))}
          </span>
        ) : (
          <TavernaAvatar userId={message.authorId} name={message.authorName} size="lg" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className={cn("text-sm font-semibold", isMine && "text-primary")}>{message.authorName}</span>
            <span className="text-muted-foreground text-[11px]">{formatTimestamp(message.createdAt)}</span>
          </div>
        )}

        {isEditing ? (
          <EditBox initial={message.content} onCancel={onCancelEdit} onSave={onSaveEdit} />
        ) : (
          <div className={cn(message.pending && "opacity-60", message.failed && "text-destructive")}>
            <ChatMarkdown text={message.content} />
            {message.editedAt && <span className="text-muted-foreground text-[10px]"> (editado)</span>}
          </div>
        )}

        {message.failed && (
          <div className="mt-0.5 flex items-center gap-3 text-xs">
            <span className="text-destructive">Não enviada.</span>
            <button type="button" onClick={onRetry} className="text-primary flex items-center gap-1 hover:underline">
              <RotateCcw className="size-3" /> Tentar de novo
            </button>
            <button type="button" onClick={onConfirmDelete} className="text-muted-foreground hover:underline">
              Descartar
            </button>
          </div>
        )}

        {isConfirmingDelete && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-destructive">Apagar esta mensagem?</span>
            <button type="button" onClick={onConfirmDelete} className="text-destructive font-semibold hover:underline">
              Apagar
            </button>
            <button type="button" onClick={onCancelDelete} className="text-muted-foreground hover:underline">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {showActions && !message.failed && (isMine || canDelete) && (
        <div className="bg-popover border-border/60 absolute -top-3 right-4 hidden items-center rounded-md border shadow-sm group-hover:flex">
          {isMine && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-muted-foreground hover:text-foreground p-1.5"
              aria-label="Editar mensagem"
              title="Editar"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onAskDelete}
              className="text-muted-foreground hover:text-destructive p-1.5"
              aria-label="Apagar mensagem"
              title="Apagar"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 240)}px`;
  }, [value]);
  return ref;
}

function EditBox({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (content: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useAutoGrow(value);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, [ref]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") onCancel();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSave(value);
    }
  };

  return (
    <div className="mt-1">
      <textarea
        ref={ref}
        value={value}
        maxLength={MESSAGE_MAX_LENGTH}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="bg-background/70 border-input focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
      />
      <p className="text-muted-foreground text-[11px]">
        Esc para <button type="button" className="text-primary hover:underline" onClick={onCancel}>cancelar</button> · Enter para{" "}
        <button type="button" className="text-primary hover:underline" onClick={() => onSave(value)}>salvar</button>
      </p>
    </div>
  );
}

function Composer({
  placeholder,
  onSend,
  onTyping,
  onEditLast,
}: {
  placeholder: string;
  onSend: (content: string) => void;
  onTyping: () => void;
  onEditLast: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useAutoGrow(value);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  const submit = () => {
    const content = value.trim();
    if (!content || content.length > MESSAGE_MAX_LENGTH) return;
    onSend(content);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
    // Seta pra cima com a caixa vazia edita a última mensagem (atalho do Discord).
    if (event.key === "ArrowUp" && value === "") {
      event.preventDefault();
      onEditLast();
    }
  };

  const remaining = MESSAGE_MAX_LENGTH - value.length;

  return (
    <div className="bg-card/60 border-border/60 focus-within:border-primary/50 flex items-end gap-2 rounded-lg border px-3 py-2 transition-colors">
      <textarea
        ref={ref}
        value={value}
        rows={1}
        maxLength={MESSAGE_MAX_LENGTH}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          if (event.target.value) onTyping();
        }}
        onKeyDown={handleKeyDown}
        className="placeholder:text-muted-foreground max-h-60 min-h-6 flex-1 resize-none bg-transparent py-1 text-sm focus:outline-none"
      />
      {remaining < 200 && (
        <span className={cn("pb-1.5 text-[11px]", remaining < 20 ? "text-destructive" : "text-muted-foreground")}>
          {remaining}
        </span>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!value.trim()}
        aria-label="Enviar"
        className="text-primary hover:bg-primary/10 rounded-md p-1.5 transition-colors disabled:opacity-30"
      >
        <SendHorizontal className="size-4" />
      </button>
    </div>
  );
}
