import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, ScrollText, Sparkles, TriangleAlert, X } from "lucide-react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppliedResultsList } from "@/components/campaign/applied-results-list";
import { NoteStructuringService } from "@/services/note-structuring-service";
import {
  applySuggestions,
  hasUndoableItems,
  undoItem,
  undoRemaining,
  type AppliedBatch,
} from "@/services/note-suggestions";
import { extractErrorMessage } from "@/utils/api-error";

const NOTE_MAX_LENGTH = 4000;

const QUESTIONS = [
  {
    key: "backstory",
    label: "Qual a história do seu personagem?",
    placeholder: "De onde ele veio, o que o trouxe até aqui...",
    section: "História",
  },
  {
    key: "personality",
    label: "Como é a personalidade dele?",
    placeholder: "O que o motiva, do que tem medo, como reage sob pressão...",
    section: "Personalidade",
  },
  {
    key: "goals",
    label: "Quais são os objetivos dele nessa jornada?",
    placeholder: "O que ele quer alcançar, o que está buscando...",
    section: "Objetivos",
  },
  {
    key: "notable",
    label: "Tem algo marcante que vale guardar?",
    placeholder: "Um segredo, uma marca, um evento que definiu quem ele é...",
    section: "Algo marcante",
  },
] as const;

type AnswerKey = (typeof QUESTIONS)[number]["key"];

function buildNoteText(answers: Record<AnswerKey, string>) {
  const sections = QUESTIONS.map((q) => {
    const value = answers[q.key].trim();
    return value ? `${q.section}: ${value}` : null;
  }).filter((s): s is string => s !== null);

  return sections.join("\n\n").slice(0, NOTE_MAX_LENGTH);
}

export function CharacterInterviewDialog({
  open,
  onClose,
  characterId,
  tabs,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  characterId: string;
  tabs: { id: string; name: string }[];
  onApplied: (tabId: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<AnswerKey, string>>({
    backstory: "",
    personality: "",
    goals: "",
    notable: "",
  });
  const [batch, setBatch] = useState<AppliedBatch | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const invalidateCharacterQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] });
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "character-tabs" && query.queryKey[2] === "blocks",
    });
  };

  const interviewMutation = useMutation({
    mutationFn: async () => {
      const noteText = buildNoteText(answers);
      const { summary, suggestions } = await NoteStructuringService.structure(characterId, noteText);
      const applied = await applySuggestions(characterId, tabs, suggestions);
      return { applied, summary };
    },
    onSuccess: ({ applied, summary }) => {
      invalidateCharacterQueries();
      if (applied.firstTabId) onApplied(applied.firstTabId);
      setBatch(applied);
      setSummary(summary);
    },
  });

  const undoAllMutation = useMutation({
    mutationFn: () => undoRemaining(batch!),
    onSuccess: () => {
      invalidateCharacterQueries();
      reset();
    },
  });

  const undoItemMutation = useMutation({
    mutationFn: (index: number) => undoItem(batch!, index),
    onSuccess: (updatedBatch) => {
      invalidateCharacterQueries();
      setBatch(updatedBatch);
    },
  });

  const undoIsPending = undoAllMutation.isPending || undoItemMutation.isPending;

  const errorMessage = interviewMutation.isError
    ? isAxiosError(interviewMutation.error) && interviewMutation.error.response?.status === 503
      ? "IA indisponível no momento, tente novamente em instantes."
      : extractErrorMessage(interviewMutation.error, "Não foi possível processar a entrevista.")
    : null;

  const undoError = undoAllMutation.error ?? undoItemMutation.error;
  const undoErrorMessage = undoError ? extractErrorMessage(undoError, "Não foi possível desfazer.") : null;

  const reset = () => {
    setAnswers({ backstory: "", personality: "", goals: "", notable: "" });
    setBatch(null);
    setSummary(null);
    interviewMutation.reset();
    undoAllMutation.reset();
    undoItemMutation.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const hasAnyAnswer = QUESTIONS.some((q) => answers[q.key].trim().length > 0);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" onClick={handleClose}>
      <div
        className="dossier-frame glass-panel flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto px-6 py-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="dossier-eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3.5" />
            Entrevista de criação
          </span>
          <button
            type="button"
            onClick={handleClose}
            title="Fechar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {batch ? (
          <>
            {summary && (
              <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                <ScrollText className="text-primary mt-0.5 size-4 shrink-0" />
                <span>{summary}</span>
              </div>
            )}
            {batch.items.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm italic">
                A IA não encontrou nada estruturável nas respostas.
              </p>
            ) : (
              <AppliedResultsList
                batch={batch}
                onUndoItem={(index) => undoItemMutation.mutate(index)}
                undoingIndex={undoItemMutation.isPending ? (undoItemMutation.variables ?? null) : null}
                disabled={undoIsPending}
              />
            )}

            {undoErrorMessage && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{undoErrorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {hasUndoableItems(batch) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => undoAllMutation.mutate()}
                  disabled={undoIsPending}
                >
                  {undoAllMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  Desfazer tudo
                </Button>
              )}
              <Button type="button" onClick={handleClose} disabled={undoIsPending}>
                Concluir
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              Responda o que quiser — a IA usa suas respostas pra já deixar o diário do personagem com o começo
              preenchido. Pode pular perguntas.
            </p>

            {QUESTIONS.map((q) => (
              <div key={q.key} className="space-y-1.5">
                <Label>{q.label}</Label>
                <Textarea
                  value={answers[q.key]}
                  onChange={(e) => setAnswers((current) => ({ ...current, [q.key]: e.target.value }))}
                  rows={3}
                  disabled={interviewMutation.isPending}
                  placeholder={q.placeholder}
                />
              </div>
            ))}

            {errorMessage && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={interviewMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => interviewMutation.mutate()}
                disabled={!hasAnyAnswer || interviewMutation.isPending}
              >
                {interviewMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {interviewMutation.isPending ? "Estruturando..." : "Estruturar com IA"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
