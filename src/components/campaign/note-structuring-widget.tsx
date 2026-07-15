import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Mic,
  Sparkles,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import { isAxiosError } from "axios";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { paths } from "@/routes/paths";
import { useSpeechDictation } from "@/hooks/use-speech-dictation";
import { CHARACTER_TAB_BLOCK_TYPE_LABELS } from "@/services/character-tab-block-service";
import { NoteStructuringService } from "@/services/note-structuring-service";
import { applySuggestions, undoSuggestions, type AppliedResult, type UndoAction } from "@/services/note-suggestions";
import { extractErrorMessage } from "@/utils/api-error";
import { cn } from "@/utils/cn";

const NOTE_MAX_LENGTH = 4000;
const SEEN_STORAGE_KEY = "rpg-workspace-ai-widget-seen";

const DAVENA_PHRASES = [
  "Posso falar minha teoria? 👀",
  "Vamos arrumar essas anotaçõezinhas?",
  "Me conta como foi a sessão!",
  "Só uma teoriazinha, rapidinho...",
  "Anotou tudo? Deixa que eu organizo.",
  "Me dá esse resuminho da sessão, vai 🥺",
  "Algum segredinho novo pra registrar?",
  "Bora dar um capricho nessa fichinha?",
];

const pickPhrase = (current?: string) => {
  const pool = DAVENA_PHRASES.filter((p) => p !== current);
  return pool[Math.floor(Math.random() * pool.length)];
};

function DavenaBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <img
        src="/davena-avatar.png"
        alt=""
        className="from-primary/30 size-7 shrink-0 rounded-full bg-gradient-to-br to-violet-500/20 object-cover"
      />
      <p className="border-border/50 bg-muted/50 rounded-2xl rounded-bl-sm border px-3 py-2 text-sm">
        {children}
      </p>
    </div>
  );
}

export function NoteStructuringWidget({
  characterId,
  tabs,
  onApplied,
  locked = false,
}: {
  characterId: string;
  tabs: { id: string; name: string }[];
  onApplied: (tabId: string) => void;
  locked?: boolean;
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isNew, setIsNew] = useState(() => localStorage.getItem(SEEN_STORAGE_KEY) !== "1");
  const [phrase, setPhrase] = useState(() => pickPhrase());
  const [noteText, setNoteText] = useState("");
  const [results, setResults] = useState<AppliedResult[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [undoActions, setUndoActions] = useState<UndoAction[] | null>(null);
  const queryClient = useQueryClient();

  const invalidateCharacterQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] });
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "character-tabs" && query.queryKey[2] === "blocks",
    });
  };

  const dictation = useSpeechDictation({
    onFinalResult: (text) => {
      setNoteText((current) => {
        const needsSpace = current.length > 0 && !/\s$/.test(current);
        return `${current}${needsSpace ? " " : ""}${text} `.slice(0, NOTE_MAX_LENGTH);
      });
    },
  });

  const structureAndApplyMutation = useMutation({
    mutationFn: async () => {
      const { summary, suggestions } = await NoteStructuringService.structure(characterId, noteText);
      const { applied, firstTabId, undo } = await applySuggestions(characterId, tabs, suggestions);
      return { applied, firstTabId, summary, undo };
    },
    onSuccess: ({ applied, firstTabId, summary, undo }) => {
      invalidateCharacterQueries();
      if (firstTabId) onApplied(firstTabId);
      setResults(applied);
      setSummary(summary);
      setUndoActions(undo);
    },
  });

  const errorMessage = structureAndApplyMutation.isError
    ? isAxiosError(structureAndApplyMutation.error) && structureAndApplyMutation.error.response?.status === 503
      ? "IA indisponível no momento, tente novamente em instantes."
      : isAxiosError(structureAndApplyMutation.error) && structureAndApplyMutation.error.response?.status === 402
        ? "A IA é exclusiva para assinantes. Assine para desbloquear."
        : extractErrorMessage(structureAndApplyMutation.error, "Não foi possível estruturar a anotação.")
    : null;

  const startNewNote = () => {
    if (dictation.isListening) dictation.stop();
    setResults(null);
    setSummary(null);
    setUndoActions(null);
    setNoteText("");
    structureAndApplyMutation.reset();
    undoMutation.reset();
  };

  const undoMutation = useMutation({
    mutationFn: undoSuggestions,
    onSuccess: () => {
      invalidateCharacterQueries();
      startNewNote();
    },
  });

  const undoErrorMessage = undoMutation.isError
    ? extractErrorMessage(undoMutation.error, "Não foi possível desfazer.")
    : null;

  const handleStructureClick = () => {
    if (dictation.isListening) dictation.stop();
    structureAndApplyMutation.mutate();
  };

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => {
          if (isNew) {
            localStorage.setItem(SEEN_STORAGE_KEY, "1");
            setIsNew(false);
          }
          setIsOpen((current) => {
            const next = !current;
            if (!next && dictation.isListening) dictation.stop();
            return next;
          });
        }}
        onMouseEnter={() => setPhrase((current) => pickPhrase(current))}
        aria-label={isOpen ? "Fechar a Davena" : "Conversar com a Davena, assistente de anotações"}
        className="group fixed right-6 bottom-6 z-50 size-16 rounded-full transition-transform hover:scale-105"
      >
        <span className="ring-primary/60 shadow-glow from-primary/50 absolute inset-0 overflow-hidden rounded-full bg-gradient-to-br to-violet-500/40 ring-2">
          <img
            src="/davena-avatar.png"
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {isOpen && (
            <span className="bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
              <X className="size-6" />
            </span>
          )}
        </span>
        {isNew && !isOpen && (
          <span className="absolute top-0 right-0 flex size-3.5">
            <span className="bg-accent absolute inline-flex size-full animate-ping rounded-full opacity-75" />
            <span className="bg-accent border-background relative inline-flex size-3.5 rounded-full border-2" />
          </span>
        )}
        {!isOpen && (
          <span className="border-border/60 bg-card/95 pointer-events-none absolute top-1/2 right-full mr-3 w-max max-w-[230px] -translate-y-1/2 translate-x-1 rounded-2xl rounded-br-sm border px-3 py-2 text-left text-sm opacity-0 shadow-xl backdrop-blur-sm transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            {phrase}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="dossier-frame glass-panel fixed right-6 bottom-24 z-50 flex max-h-[82vh] w-[460px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden shadow-2xl">
          <div className="border-border/50 from-primary/15 via-primary/5 relative shrink-0 border-b bg-gradient-to-r to-transparent px-5 pt-4 pb-3">
            <img
              src="/davena.png"
              alt=""
              className="pointer-events-none absolute right-4 bottom-0 h-24 object-contain opacity-95 select-none"
            />
            <p className="text-lg leading-tight font-semibold">Davena</p>
            <span className="dossier-eyebrow mt-1 flex items-center gap-1.5">
              <Sparkles className="size-3" />
              Guardiã de anotações
            </span>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
            {locked ? (
              <>
                <DavenaBubble>
                  Cole (ou dite) suas anotações da sessão e eu organizo tudo direto na ficha do
                  personagem. Esse recurso é exclusivo para assinantes.
                </DavenaBubble>
                <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <Lock className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>Assine para desbloquear a Davena.</span>
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => navigate(paths.subscription)}>
                    Assinar para desbloquear
                  </Button>
                </div>
              </>
            ) : results ? (
              <>
                {summary && <DavenaBubble>{summary}</DavenaBubble>}
                {results.length === 0 ? (
                  <p className="text-muted-foreground py-6 text-center text-sm italic">
                    Não encontrei nada estruturável nessa anotação.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {results.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="text-primary mt-0.5 size-3.5 shrink-0" />
                        <span>
                          <strong>{r.mode === "update" ? "Atualizado" : "Criado"}</strong> em {r.tabName}
                          {r.title ? ` · ${r.title}` : ""}
                          <span className="text-muted-foreground">
                            {" "}
                            ({CHARACTER_TAB_BLOCK_TYPE_LABELS[r.type]})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-muted-foreground text-xs italic">
                  Confira o resultado direto na aba/bloco correspondente da ficha.
                </p>

                {undoErrorMessage && (
                  <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{undoErrorMessage}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {undoActions && undoActions.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => undoMutation.mutate(undoActions)}
                      disabled={undoMutation.isPending}
                      title="Reverte os blocos criados/atualizados por essa anotação"
                    >
                      {undoMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                      Desfazer
                    </Button>
                  )}
                  <Button type="button" onClick={startNewNote} disabled={undoMutation.isPending}>
                    Nova anotação
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DavenaBubble>
                  Me conta o que rolou na sessão — cola (ou dita) suas anotações que eu organizo
                  tudo na ficha. ✒️
                </DavenaBubble>
                <div className="space-y-1">
                  <div className="relative">
                    <Textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                      rows={8}
                      maxLength={NOTE_MAX_LENGTH}
                      disabled={structureAndApplyMutation.isPending}
                      placeholder={
                        dictation.isListening
                          ? "Ouvindo... fale sua anotação."
                          : "Cole aqui sua anotação livre (ex.: resumo da sessão, descrição de um NPC que conheceu...)"
                      }
                      className="pr-10"
                    />
                    {dictation.isSupported && (
                      <button
                        type="button"
                        onClick={() => (dictation.isListening ? dictation.stop() : dictation.start())}
                        disabled={structureAndApplyMutation.isPending}
                        title={dictation.isListening ? "Parar ditado por voz" : "Ditar anotação por voz"}
                        className={cn(
                          "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          dictation.isListening
                            ? "bg-destructive text-destructive-foreground animate-pulse"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
                        )}
                      >
                        {dictation.isListening ? (
                          <Square className="size-3" />
                        ) : (
                          <Mic className="size-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-muted-foreground text-right text-xs">
                    {noteText.length}/{NOTE_MAX_LENGTH}
                  </div>
                </div>

                {dictation.error && (
                  <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{dictation.error}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleStructureClick}
                    disabled={!noteText.trim() || structureAndApplyMutation.isPending}
                  >
                    {structureAndApplyMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    {structureAndApplyMutation.isPending ? "Organizando e salvando..." : "Organizar com a Davena"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
