import { useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2, MessageCircle, TriangleAlert, Wand2, X } from "lucide-react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CHARACTER_TAB_BLOCK_TYPE_LABELS,
  CharacterTabBlockService,
  CharacterTabBlockType,
  type CharacterTabBlockTypeValue,
} from "@/services/character-tab-block-service";
import { CharacterTabService } from "@/services/character-tab-service";
import { NoteStructuringService } from "@/services/note-structuring-service";
import { extractErrorMessage } from "@/utils/api-error";

const PAYLOAD_TYPES: CharacterTabBlockTypeValue[] = [CharacterTabBlockType.Card, CharacterTabBlockType.Table];
const NOTE_MAX_LENGTH = 4000;

type AppliedResult = {
  mode: "update" | "create";
  tabName: string;
  type: CharacterTabBlockTypeValue;
  title: string | null;
};

export function NoteStructuringWidget({
  characterId,
  tabs,
  onApplied,
}: {
  characterId: string;
  tabs: { id: string; name: string }[];
  onApplied: (tabId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [results, setResults] = useState<AppliedResult[] | null>(null);
  const queryClient = useQueryClient();

  const structureAndApplyMutation = useMutation({
    mutationFn: async () => {
      const suggestions = await NoteStructuringService.structure(characterId, noteText);
      const newTabByName = new Map<string, { id: string; name: string }>();
      const applied: AppliedResult[] = [];
      let firstTabId: string | null = null;

      for (const suggestion of suggestions) {
        const payloadJson = PAYLOAD_TYPES.includes(suggestion.type) ? suggestion.payloadJson : null;

        if (suggestion.targetBlockId && suggestion.targetTabId) {
          await CharacterTabBlockService.update(suggestion.targetBlockId, {
            title: suggestion.title,
            content: suggestion.content,
            payloadJson,
          });

          const tabName = tabs.find((t) => t.id === suggestion.targetTabId)?.name ?? "?";
          applied.push({ mode: "update", tabName, type: suggestion.type, title: suggestion.title });
          firstTabId ??= suggestion.targetTabId;
          continue;
        }

        let tabId = suggestion.targetTabId;
        let tabName = tabs.find((t) => t.id === tabId)?.name ?? "";

        if (!tabId) {
          const name = suggestion.suggestedNewTabName?.trim() || "Nova aba";
          const cached = newTabByName.get(name);
          if (cached) {
            tabId = cached.id;
            tabName = cached.name;
          } else {
            const createdTab = await CharacterTabService.create(characterId, { name });
            newTabByName.set(name, { id: createdTab.id, name: createdTab.name });
            tabId = createdTab.id;
            tabName = createdTab.name;
          }
        }

        await CharacterTabBlockService.create(tabId, {
          type: suggestion.type,
          title: suggestion.title,
          content: suggestion.content,
          payloadJson,
        });

        applied.push({ mode: "create", tabName, type: suggestion.type, title: suggestion.title });
        firstTabId ??= tabId;
      }

      return { applied, firstTabId };
    },
    onSuccess: ({ applied, firstTabId }) => {
      queryClient.invalidateQueries({ queryKey: ["characters", characterId, "tabs"] });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "character-tabs" && query.queryKey[2] === "blocks",
      });
      if (firstTabId) onApplied(firstTabId);
      setResults(applied);
    },
  });

  const errorMessage = structureAndApplyMutation.isError
    ? isAxiosError(structureAndApplyMutation.error) && structureAndApplyMutation.error.response?.status === 503
      ? "IA indisponível no momento, tente novamente em instantes."
      : extractErrorMessage(structureAndApplyMutation.error, "Não foi possível estruturar a anotação.")
    : null;

  const startNewNote = () => {
    setResults(null);
    setNoteText("");
    structureAndApplyMutation.reset();
  };

  return createPortal(
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        title={isOpen ? "Fechar" : "Estruturar anotação com IA"}
        aria-label={isOpen ? "Fechar assistente de anotações" : "Abrir assistente de anotações"}
        className="bg-primary text-primary-foreground shadow-glow fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full transition-transform hover:scale-105"
      >
        {isOpen ? <X className="size-5" /> : <MessageCircle className="size-6" />}
      </button>

      {isOpen && (
        <div className="dossier-frame glass-panel fixed right-6 bottom-24 z-50 flex max-h-[75vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto px-5 py-4 shadow-2xl">
          <span className="dossier-eyebrow flex items-center gap-1.5">
            <Wand2 className="size-3.5" />
            Estruturar anotação com IA
          </span>

          {results ? (
            <>
              {results.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm italic">
                  A IA não encontrou nada estruturável nessa anotação.
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
              <div className="flex justify-end">
                <Button type="button" onClick={startNewNote}>
                  Nova anotação
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                  rows={6}
                  maxLength={NOTE_MAX_LENGTH}
                  disabled={structureAndApplyMutation.isPending}
                  placeholder="Cole aqui sua anotação livre (ex.: resumo da sessão, descrição de um NPC que conheceu...)"
                />
                <div className="text-muted-foreground text-right text-xs">
                  {noteText.length}/{NOTE_MAX_LENGTH}
                </div>
              </div>

              {errorMessage && (
                <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => structureAndApplyMutation.mutate()}
                  disabled={!noteText.trim() || structureAndApplyMutation.isPending}
                >
                  {structureAndApplyMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                  {structureAndApplyMutation.isPending ? "Estruturando e salvando..." : "Estruturar com IA"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
