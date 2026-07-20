import { Sparkles } from "lucide-react";
import {
  CHARACTER_TAB_BLOCK_TYPE_LABELS,
  CharacterTabBlockType,
  type CardBlockPayload,
  type TableBlockPayload,
} from "@/services/character-tab-block-service";
import type { FlatBlock, ReviewAction, ReviewDecision } from "@/services/note-suggestions";
import { Select } from "@/components/ui/select";
import { cn } from "@/utils/cn";

const NEW_TAB_VALUE = "__new__";

/** Preview curto do que a Davena vai gravar — texto, ou um resumo do payload de Card/Table. */
function previewContent(decision: ReviewDecision): string {
  const { suggestion } = decision;
  if (suggestion.type === CharacterTabBlockType.Card && suggestion.payloadJson) {
    try {
      const rows = (JSON.parse(suggestion.payloadJson) as CardBlockPayload).rows ?? [];
      return rows.map((r) => `${r.k}: ${r.v}`).join(" · ");
    } catch {
      /* cai pro content */
    }
  }
  if (suggestion.type === CharacterTabBlockType.Table && suggestion.payloadJson) {
    try {
      const rows = (JSON.parse(suggestion.payloadJson) as TableBlockPayload).rows ?? [];
      return `${rows.length} linha(s)`;
    } catch {
      /* cai pro content */
    }
  }
  return suggestion.content ?? "";
}

/** Revisão editável do que a Davena propõe: por item, o usuário troca a ação (atualizar/criar/pular)
 * e escolhe o destino (qual bloco incrementar, ou em qual aba criar) antes de aplicar. */
export function SuggestionReviewList({
  decisions,
  blocks,
  tabs,
  onChange,
  disabled,
}: {
  decisions: ReviewDecision[];
  blocks: FlatBlock[];
  tabs: { id: string; name: string }[];
  onChange: (index: number, next: ReviewDecision) => void;
  disabled?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {decisions.map((decision, index) => {
        const { suggestion } = decision;
        const preview = previewContent(decision);
        const typeLabel = CHARACTER_TAB_BLOCK_TYPE_LABELS[suggestion.type];
        const selectedTabValue = decision.targetTabId ?? (decision.suggestedNewTabName ? NEW_TAB_VALUE : "");

        return (
          <li
            key={index}
            className={cn(
              "border-border/50 bg-background/40 rounded-lg border p-3 text-sm",
              decision.action === "skip" && "opacity-55",
            )}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="font-medium">
                {suggestion.title?.trim() || "(sem título)"}
                <span className="text-muted-foreground font-normal"> · {typeLabel}</span>
              </span>
              {decision.autoMatched && decision.action === "update" && (
                <span className="border-primary/30 bg-primary/10 text-primary inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]">
                  <Sparkles className="size-3" />
                  já existe
                </span>
              )}
            </div>

            {preview && (
              <p className="text-muted-foreground mb-2.5 line-clamp-3 text-xs">{preview}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="O que fazer com esta sugestão"
                value={decision.action}
                disabled={disabled}
                onChange={(e) =>
                  onChange(index, { ...decision, action: e.target.value as ReviewAction })
                }
                className="h-9 w-auto min-w-28 flex-none"
              >
                <option value="update">Atualizar</option>
                <option value="create">Criar novo</option>
                <option value="skip">Pular</option>
              </Select>

              {decision.action === "update" && (
                <Select
                  aria-label="Qual bloco atualizar"
                  value={decision.targetBlockId ?? ""}
                  disabled={disabled || blocks.length === 0}
                  onChange={(e) => {
                    const block = blocks.find((b) => b.id === e.target.value);
                    onChange(index, {
                      ...decision,
                      targetBlockId: block?.id ?? null,
                      targetTabId: block?.tabId ?? decision.targetTabId,
                    });
                  }}
                  className="h-9 min-w-0 flex-1"
                >
                  {blocks.length === 0 && <option value="">(nenhum bloco existente)</option>}
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.tabName} · {block.title?.trim() || "(sem título)"}
                    </option>
                  ))}
                </Select>
              )}

              {decision.action === "create" && (
                <Select
                  aria-label="Em qual aba criar"
                  value={selectedTabValue}
                  disabled={disabled}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === NEW_TAB_VALUE) {
                      onChange(index, {
                        ...decision,
                        targetTabId: null,
                        suggestedNewTabName:
                          suggestion.suggestedNewTabName?.trim() || "Nova aba",
                      });
                    } else {
                      onChange(index, { ...decision, targetTabId: value, suggestedNewTabName: null });
                    }
                  }}
                  className="h-9 min-w-0 flex-1"
                >
                  {tabs.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.name}
                    </option>
                  ))}
                  {suggestion.suggestedNewTabName?.trim() && (
                    <option value={NEW_TAB_VALUE}>
                      + Nova aba: {suggestion.suggestedNewTabName.trim()}
                    </option>
                  )}
                </Select>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
