import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, ScrollText, TriangleAlert, X } from "lucide-react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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

const SHEET_MAX_LENGTH = 4000;

export function CharacterImportDialog({
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
  const [sheetText, setSheetText] = useState("");
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

  const importMutation = useMutation({
    mutationFn: async () => {
      const { summary, suggestions } = await NoteStructuringService.importSheet(characterId, sheetText);
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

  const errorMessage = importMutation.isError
    ? isAxiosError(importMutation.error) && importMutation.error.response?.status === 503
      ? "IA indisponível no momento, tente novamente em instantes."
      : extractErrorMessage(importMutation.error, "Não foi possível importar a ficha.")
    : null;

  const undoError = undoAllMutation.error ?? undoItemMutation.error;
  const undoErrorMessage = undoError ? extractErrorMessage(undoError, "Não foi possível desfazer.") : null;

  const reset = () => {
    setSheetText("");
    setBatch(null);
    setSummary(null);
    importMutation.reset();
    undoAllMutation.reset();
    undoItemMutation.reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" onClick={handleClose}>
      <div
        className="dossier-frame glass-panel flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto px-6 py-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="dossier-eyebrow flex items-center gap-1.5">
            <FileUp className="size-3.5" />
            Importar ficha existente
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
                A IA não reconheceu isso como uma ficha de personagem.
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
              Cole abaixo o texto da ficha do seu personagem (de D&D Beyond, um PDF copiado, ou suas próprias
              anotações). A IA organiza tudo em blocos no diário.
            </p>

            <div className="space-y-1">
              <Textarea
                value={sheetText}
                onChange={(e) => setSheetText(e.target.value.slice(0, SHEET_MAX_LENGTH))}
                rows={10}
                maxLength={SHEET_MAX_LENGTH}
                disabled={importMutation.isPending}
                placeholder="Cole aqui o texto da ficha..."
              />
              <div className="text-muted-foreground text-right text-xs">
                {sheetText.length}/{SHEET_MAX_LENGTH}
              </div>
            </div>

            {errorMessage && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={importMutation.isPending}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={!sheetText.trim() || importMutation.isPending}
              >
                {importMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {importMutation.isPending ? "Importando..." : "Importar com IA"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
