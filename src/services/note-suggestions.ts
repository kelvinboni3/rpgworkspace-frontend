import {
  CharacterTabBlockService,
  CharacterTabBlockType,
  type CharacterTabBlockTypeValue,
} from "@/services/character-tab-block-service";
import { CharacterTabService } from "@/services/character-tab-service";
import type { SuggestedBlock } from "@/services/note-structuring-service";

const PAYLOAD_TYPES: CharacterTabBlockTypeValue[] = [CharacterTabBlockType.Card, CharacterTabBlockType.Table];

export type AppliedResult = {
  mode: "update" | "create";
  tabName: string;
  type: CharacterTabBlockTypeValue;
  title: string | null;
};

export type UndoAction =
  | {
      type: "restore-block";
      blockId: string;
      previous: { title: string | null; content: string | null; payloadJson: string | null };
    }
  | { type: "delete-block"; blockId: string }
  | { type: "delete-tab"; tabId: string };

/** Applies AI suggestions (from note structuring, the creation interview, or a sheet import)
 * against the character's real tabs/blocks, tracking enough to undo the whole batch. */
export async function applySuggestions(
  characterId: string,
  tabs: { id: string; name: string }[],
  suggestions: SuggestedBlock[],
): Promise<{ applied: AppliedResult[]; firstTabId: string | null; undo: UndoAction[] }> {
  const newTabByName = new Map<string, { id: string; name: string }>();
  const createdTabIds = new Set<string>();
  const applied: AppliedResult[] = [];
  const undo: UndoAction[] = [];
  let firstTabId: string | null = null;

  for (const suggestion of suggestions) {
    const payloadJson = PAYLOAD_TYPES.includes(suggestion.type) ? suggestion.payloadJson : null;

    if (suggestion.targetBlockId && suggestion.targetTabId) {
      const previousBlock = await CharacterTabBlockService.getById(suggestion.targetBlockId);
      undo.push({
        type: "restore-block",
        blockId: suggestion.targetBlockId,
        previous: {
          title: previousBlock.title,
          content: previousBlock.content,
          payloadJson: previousBlock.payloadJson,
        },
      });

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
        createdTabIds.add(createdTab.id);
        undo.push({ type: "delete-tab", tabId: createdTab.id });
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

    // A block created inside a tab we just created this batch is already covered by that
    // tab's own "delete-tab" undo action (deleting the tab cascades to its blocks).
    if (!createdTabIds.has(tabId)) {
      undo.push({ type: "delete-block", blockId: createdBlock.id });
    }

    applied.push({ mode: "create", tabName, type: suggestion.type, title: suggestion.title });
    firstTabId ??= tabId;
  }

  return { applied, firstTabId, undo };
}

export async function undoSuggestions(actions: UndoAction[]): Promise<void> {
  for (const action of [...actions].reverse()) {
    if (action.type === "restore-block") {
      await CharacterTabBlockService.update(action.blockId, action.previous);
    } else if (action.type === "delete-block") {
      await CharacterTabBlockService.remove(action.blockId);
    } else {
      await CharacterTabService.remove(action.tabId);
    }
  }
}
