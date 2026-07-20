import {
  CharacterTabBlockService,
  CharacterTabBlockType,
  type CharacterTabBlockTypeValue,
} from "@/services/character-tab-block-service";
import { CharacterTabService } from "@/services/character-tab-service";
import type { SuggestedBlock } from "@/services/note-structuring-service";

const PAYLOAD_TYPES: CharacterTabBlockTypeValue[] = [CharacterTabBlockType.Card, CharacterTabBlockType.Table];

type CardRow = { k: string; v: string };
type CardPayload = { rows: CardRow[] };
type TablePayload = { headers: string[]; rows: string[][] };

function parseJson<T>(raw: string | null): T | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Junta o texto que já estava no bloco com o que a IA devolveu, sem perder o antigo.
 * Robusto aos dois comportamentos do modelo: se ele devolveu o texto já mesclado (contendo
 * o antigo), usamos o dele; se devolveu só a novidade, anexamos ao antigo. Assim a correção
 * funciona mesmo com o backend atual, que pede o texto mesclado mas nem sempre recebe. */
function mergeTextContent(previous: string | null, incoming: string | null): string | null {
  const prev = previous?.trim() ? previous : null;
  const next = incoming?.trim() ? incoming : null;
  if (!prev) return next;
  if (!next) return prev;
  if (next.includes(prev.trim())) return next; // a IA já devolveu mesclado
  return `${prev}\n\n${next}`;
}

/** Upsert das linhas do Card por chave: mantém todas as linhas antigas, atualiza o valor
 * quando a IA reenvia a mesma chave e acrescenta as novas — nunca remove o que já existia. */
function mergeCardPayload(previousJson: string | null, incomingJson: string | null): string | null {
  const prevRows = parseJson<CardPayload>(previousJson)?.rows;
  const nextRows = parseJson<CardPayload>(incomingJson)?.rows;
  if (!Array.isArray(prevRows)) return incomingJson ?? previousJson;
  if (!Array.isArray(nextRows)) return previousJson;

  const merged: CardRow[] = prevRows.map((row) => ({ ...row }));
  for (const row of nextRows) {
    if (!row || typeof row.k !== "string") continue;
    const key = row.k.trim().toLowerCase();
    const existing = merged.find((r) => r.k.trim().toLowerCase() === key);
    if (existing) existing.v = row.v;
    else merged.push({ k: row.k, v: row.v });
  }
  return JSON.stringify({ rows: merged });
}

/** Mantém as linhas existentes da Tabela e acrescenta só as novas (sem duplicar linhas idênticas). */
function mergeTablePayload(previousJson: string | null, incomingJson: string | null): string | null {
  const previous = parseJson<TablePayload>(previousJson);
  const incoming = parseJson<TablePayload>(incomingJson);
  const prevRows = previous?.rows;
  const nextRows = incoming?.rows;
  if (!Array.isArray(prevRows)) return incomingJson ?? previousJson;
  if (!Array.isArray(nextRows)) return previousJson;

  const headers =
    Array.isArray(previous?.headers) && previous.headers.length > 0
      ? previous.headers
      : (incoming?.headers ?? []);
  const seen = new Set(prevRows.map((row) => JSON.stringify(row)));
  const merged = [...prevRows];
  for (const row of nextRows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return JSON.stringify({ headers, rows: merged });
}

type BlockSnapshot = { title: string | null; content: string | null; payloadJson: string | null };

type ItemUndo =
  | { kind: "restore-block"; blockId: string; previous: BlockSnapshot }
  | { kind: "delete-block"; blockId: string; createdTabId: string | null };

export type AppliedItem = {
  mode: "update" | "create";
  tabName: string;
  type: CharacterTabBlockTypeValue;
  title: string | null;
  undone: boolean;
  undo: ItemUndo;
};

export type AppliedBatch = {
  items: AppliedItem[];
  firstTabId: string | null;
};

export const hasUndoableItems = (batch: AppliedBatch) => batch.items.some((item) => !item.undone);

/** Applies AI suggestions (from note structuring, the creation interview, or a sheet import)
 * against the character's real tabs/blocks, tracking enough to undo each item individually
 * (or all of them). Every created block records its own delete-block undo; a block that landed
 * in a tab created by this same batch also records that tab's id, so undoing the last item of
 * the tab can clean the tab up too (no reliance on delete-tab cascade — that would also wipe
 * blocks the user added to the new tab by hand in the meantime). */
export async function applySuggestions(
  characterId: string,
  tabs: { id: string; name: string }[],
  suggestions: SuggestedBlock[],
): Promise<AppliedBatch> {
  const newTabByName = new Map<string, { id: string; name: string }>();
  const createdTabIds = new Set<string>();
  const items: AppliedItem[] = [];
  let firstTabId: string | null = null;

  for (const suggestion of suggestions) {
    const payloadJson = PAYLOAD_TYPES.includes(suggestion.type) ? suggestion.payloadJson : null;

    if (suggestion.targetBlockId && suggestion.targetTabId) {
      const previousBlock = await CharacterTabBlockService.getById(suggestion.targetBlockId);

      // Ao ATUALIZAR um bloco que já existe, a Davena deve incrementar, nunca apagar o que
      // já estava lá. O merge é feito aqui (não confiamos no modelo devolver o texto mesclado)
      // e usa o tipo do bloco existente — o tipo é imutável no update. O título antigo é
      // preservado quando a sugestão não traz um novo, pra não zerar por engano.
      let mergedContent: string | null;
      let mergedPayloadJson: string | null;
      if (previousBlock.type === CharacterTabBlockType.Card) {
        mergedContent = previousBlock.content;
        mergedPayloadJson = mergeCardPayload(previousBlock.payloadJson, suggestion.payloadJson);
      } else if (previousBlock.type === CharacterTabBlockType.Table) {
        mergedContent = previousBlock.content;
        mergedPayloadJson = mergeTablePayload(previousBlock.payloadJson, suggestion.payloadJson);
      } else {
        mergedContent = mergeTextContent(previousBlock.content, suggestion.content);
        mergedPayloadJson = previousBlock.payloadJson;
      }

      await CharacterTabBlockService.update(suggestion.targetBlockId, {
        title: suggestion.title ?? previousBlock.title,
        content: mergedContent,
        payloadJson: mergedPayloadJson,
      });

      const tabName = tabs.find((t) => t.id === suggestion.targetTabId)?.name ?? "?";
      items.push({
        mode: "update",
        tabName,
        type: suggestion.type,
        title: suggestion.title,
        undone: false,
        undo: {
          kind: "restore-block",
          blockId: suggestion.targetBlockId,
          previous: {
            title: previousBlock.title,
            content: previousBlock.content,
            payloadJson: previousBlock.payloadJson,
          },
        },
      });
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
        createdTabIds.add(createdTab.id);
        tabId = createdTab.id;
        tabName = createdTab.name;
      }
    }

    const createdBlock = await CharacterTabBlockService.create(tabId, {
      type: suggestion.type,
      title: suggestion.title,
      content: suggestion.content,
      payloadJson,
    });

    items.push({
      mode: "create",
      tabName,
      type: suggestion.type,
      title: suggestion.title,
      undone: false,
      undo: {
        kind: "delete-block",
        blockId: createdBlock.id,
        createdTabId: createdTabIds.has(tabId) ? tabId : null,
      },
    });
    firstTabId ??= tabId;
  }

  return { items, firstTabId };
}

async function undoSingle(items: AppliedItem[], index: number): Promise<void> {
  const item = items[index];
  if (item.undone) return;

  if (item.undo.kind === "restore-block") {
    await CharacterTabBlockService.update(item.undo.blockId, item.undo.previous);
  } else {
    await CharacterTabBlockService.remove(item.undo.blockId);
  }
  items[index] = { ...item, undone: true };

  // Se este era o último item ainda aplicado numa aba que o lote criou, remove a aba também —
  // mas só se ela estiver realmente vazia (o usuário pode ter criado blocos nela à mão depois).
  if (item.undo.kind === "delete-block" && item.undo.createdTabId) {
    const tabId = item.undo.createdTabId;
    const stillUsed = items.some(
      (other) => !other.undone && other.undo.kind === "delete-block" && other.undo.createdTabId === tabId,
    );
    if (!stillUsed) {
      const remainingBlocks = await CharacterTabBlockService.getAllByTab(tabId);
      if (remainingBlocks.length === 0) await CharacterTabService.remove(tabId);
    }
  }
}

/** Desfaz um único item aplicado; devolve o lote atualizado (imutável) para guardar no estado. */
export async function undoItem(batch: AppliedBatch, index: number): Promise<AppliedBatch> {
  const items = [...batch.items];
  await undoSingle(items, index);
  return { ...batch, items };
}

/** Desfaz todos os itens ainda aplicados, em ordem reversa — se duas sugestões atualizaram o
 * mesmo bloco, restaurar da última para a primeira devolve o conteúdo original. */
export async function undoRemaining(batch: AppliedBatch): Promise<AppliedBatch> {
  const items = [...batch.items];
  for (let index = items.length - 1; index >= 0; index--) {
    await undoSingle(items, index);
  }
  return { ...batch, items };
}
