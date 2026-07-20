import {
  type CharacterTabBlock,
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

// Espelham as validações do backend (UpdateCharacterTabBlockRequest): Content [MaxLength(50000)]
// e Title [MaxLength(200)]. Como agora acumulamos conteúdo ao atualizar, respeitamos o teto no
// cliente como rede de segurança — só age exatamente no ponto em que o backend rejeitaria (nunca
// corta conteúdo que o backend aceitaria), convertendo um raro 400 num corte gracioso do excedente.
const MAX_CONTENT_LENGTH = 50000;
const MAX_TITLE_LENGTH = 200;

const capLength = (value: string | null, max: number): string | null =>
  value !== null && value.length > max ? value.slice(0, max) : value;

/** Ignora diferenças de espaço/quebra de linha ao comparar se um texto já contém o outro. */
const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

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
 * o antigo, ignorando espaçamento), usamos o dele; se devolveu só a novidade, anexamos ao antigo.
 * O resultado é limitado a MAX_CONTENT_LENGTH — como o conteúdo antigo vem primeiro, ele nunca é
 * perdido; só o excedente da adição mais nova é cortado, evitando o 400 do backend. */
function mergeTextContent(previous: string | null, incoming: string | null): string | null {
  const prev = previous?.trim() ? previous : null;
  const next = incoming?.trim() ? incoming : null;
  if (!prev) return capLength(next, MAX_CONTENT_LENGTH);
  if (!next) return capLength(prev, MAX_CONTENT_LENGTH);
  if (normalizeWhitespace(next).includes(normalizeWhitespace(prev)))
    return capLength(next, MAX_CONTENT_LENGTH); // a IA já devolveu mesclado
  return capLength(`${prev}\n\n${next}`, MAX_CONTENT_LENGTH);
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

// ---------------------------------------------------------------------------
// Matching determinístico: casar a sugestão da IA com um bloco já existente.
// Tira do modelo (one-shot, instável) a decisão de "atualizar qual bloco vs.
// criar novo" e a torna previsível/ajustável — a maior fonte de instabilidade.
// ---------------------------------------------------------------------------

/** Bloco "achatado" (fora da árvore) com o contexto da aba — usado no matching e no seletor de destino. */
export type FlatBlock = {
  id: string;
  tabId: string;
  tabName: string;
  title: string | null;
  type: CharacterTabBlockTypeValue;
};

/** Achata a árvore de blocos de uma aba (inclui os filhos) anexando o contexto da aba. */
export function flattenBlocks(tree: CharacterTabBlock[], tabId: string, tabName: string): FlatBlock[] {
  const out: FlatBlock[] = [];
  const walk = (blocks: CharacterTabBlock[]) => {
    for (const block of blocks) {
      out.push({ id: block.id, tabId, tabName, title: block.title, type: block.type });
      if (block.children?.length) walk(block.children);
    }
  };
  walk(tree);
  return out;
}

const normalizeTitle = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas diacríticas combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Similaridade 0..1 entre dois títulos: 1 se iguais (normalizados); senão coeficiente de
 * sobreposição de tokens, com bônus quando um título contém o outro. Simples e previsível. */
function scoreTitleMatch(a: string | null, b: string | null): number {
  const na = a ? normalizeTitle(a) : "";
  const nb = b ? normalizeTitle(b) : "";
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const token of ta) if (tb.has(token)) common++;
  const overlap = common / Math.min(ta.size, tb.size);
  const contains = na.includes(nb) || nb.includes(na) ? 0.2 : 0;
  return Math.min(1, overlap + contains);
}

const MATCH_THRESHOLD = 0.6;

/** Melhor bloco existente pra uma sugestão, por título; desempata preferindo mesmo tipo e mesma
 * aba sugerida. Retorna null se nada passar do limite (aí é criação). */
function matchExistingBlock(suggestion: SuggestedBlock, blocks: FlatBlock[]): FlatBlock | null {
  if (!suggestion.title?.trim() || blocks.length === 0) return null;
  let best: FlatBlock | null = null;
  let bestScore = 0;
  for (const block of blocks) {
    let score = scoreTitleMatch(suggestion.title, block.title);
    if (score <= 0) continue;
    if (block.type === suggestion.type) score += 0.05;
    if (suggestion.targetTabId && block.tabId === suggestion.targetTabId) score += 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = block;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : null;
}

// ---------------------------------------------------------------------------
// Decisão revisável: o que a Davena PROPÕE fazer com cada sugestão. O usuário
// confirma/ajusta antes de gravar (troca criar↔atualizar, escolhe outro bloco,
// pula). Assim um erro de casamento do modelo nunca vira um write silencioso.
// ---------------------------------------------------------------------------

export type ReviewAction = "update" | "create" | "skip";

export type ReviewDecision = {
  suggestion: SuggestedBlock;
  action: ReviewAction;
  /** update: id do bloco a incrementar. */
  targetBlockId: string | null;
  /** update: aba do bloco; create: aba existente escolhida (null = criar aba nova). */
  targetTabId: string | null;
  /** create: nome da aba nova quando targetTabId é null. */
  suggestedNewTabName: string | null;
  /** true quando o código casou uma sugestão de "criar" com um bloco já existente (dica na UI). */
  autoMatched: boolean;
};

/** Decisões-padrão a partir das sugestões da IA + matching determinístico: confia no bloco que a
 * IA mandou atualizar; quando a IA quer CRIAR mas já existe um bloco de título parecido, propõe
 * ATUALIZAR aquele (autoMatched) em vez de duplicar. Sem `blocks` (import/entrevista), mantém a
 * decisão crua da IA. O usuário revisa tudo depois via a UI de revisão. */
export function resolveSuggestions(
  suggestions: SuggestedBlock[],
  blocks: FlatBlock[] = [],
): ReviewDecision[] {
  return suggestions.map((suggestion): ReviewDecision => {
    if (suggestion.targetBlockId) {
      const tabId = blocks.find((b) => b.id === suggestion.targetBlockId)?.tabId ?? suggestion.targetTabId;
      return {
        suggestion,
        action: "update",
        targetBlockId: suggestion.targetBlockId,
        targetTabId: tabId,
        suggestedNewTabName: null,
        autoMatched: false,
      };
    }
    const match = matchExistingBlock(suggestion, blocks);
    if (match) {
      return {
        suggestion,
        action: "update",
        targetBlockId: match.id,
        targetTabId: match.tabId,
        suggestedNewTabName: null,
        autoMatched: true,
      };
    }
    return {
      suggestion,
      action: "create",
      targetBlockId: null,
      targetTabId: suggestion.targetTabId,
      suggestedNewTabName: suggestion.suggestedNewTabName,
      autoMatched: false,
    };
  });
}

/** Aplica as decisões revisadas contra as abas/blocos reais do personagem, guardando o suficiente
 * para desfazer cada item individualmente (ou todos). Cada bloco criado guarda seu próprio
 * delete-block; um bloco que caiu numa aba criada por este mesmo lote também guarda o id dessa aba,
 * pra que desfazer o último item da aba possa limpá-la (sem depender do cascade de delete-tab, que
 * apagaria também blocos que o usuário criou na aba nova à mão nesse meio-tempo). */
export async function applyDecisions(
  characterId: string,
  tabs: { id: string; name: string }[],
  decisions: ReviewDecision[],
): Promise<AppliedBatch> {
  const newTabByName = new Map<string, { id: string; name: string }>();
  const createdTabIds = new Set<string>();
  const items: AppliedItem[] = [];
  let firstTabId: string | null = null;

  for (const decision of decisions) {
    if (decision.action === "skip") continue;
    const { suggestion } = decision;
    const payloadJson = PAYLOAD_TYPES.includes(suggestion.type) ? suggestion.payloadJson : null;

    if (decision.action === "update" && decision.targetBlockId) {
      const previousBlock = await CharacterTabBlockService.getById(decision.targetBlockId);

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

      await CharacterTabBlockService.update(decision.targetBlockId, {
        title: capLength(suggestion.title ?? previousBlock.title, MAX_TITLE_LENGTH),
        content: mergedContent,
        payloadJson: mergedPayloadJson,
      });

      const tabName = tabs.find((t) => t.id === decision.targetTabId)?.name ?? "?";
      items.push({
        mode: "update",
        tabName,
        type: previousBlock.type,
        // Sempre o título real do bloco (a IA nem sempre reenvia um título no update) — assim a
        // lista de resultados mostra QUAL bloco foi mexido (ex.: "Pessoas · Ryuka"), não só a aba.
        title: suggestion.title ?? previousBlock.title,
        undone: false,
        undo: {
          kind: "restore-block",
          blockId: decision.targetBlockId,
          previous: {
            title: previousBlock.title,
            content: previousBlock.content,
            payloadJson: previousBlock.payloadJson,
          },
        },
      });
      firstTabId ??= decision.targetTabId;
      continue;
    }

    // create
    let tabId = decision.targetTabId;
    let tabName = tabs.find((t) => t.id === tabId)?.name ?? "";

    if (!tabId) {
      const name = decision.suggestedNewTabName?.trim() || "Nova aba";
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

/** Compat: aplica sugestões cruas da IA sem revisão nem matching (usado pelo import de ficha e
 * pela entrevista de criação, que aplicam direto). A Davena passou a usar o fluxo revisável
 * (resolveSuggestions → UI → applyDecisions). */
export async function applySuggestions(
  characterId: string,
  tabs: { id: string; name: string }[],
  suggestions: SuggestedBlock[],
): Promise<AppliedBatch> {
  return applyDecisions(characterId, tabs, resolveSuggestions(suggestions));
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
