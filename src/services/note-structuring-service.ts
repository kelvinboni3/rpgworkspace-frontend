import { apiClient } from "@/services/api-client";
import type { CharacterTabBlockTypeValue } from "@/services/character-tab-block-service";

export type SuggestedBlock = {
  targetBlockId: string | null;
  targetBlockLabel: string | null;
  targetTabId: string | null;
  suggestedNewTabName: string | null;
  type: CharacterTabBlockTypeValue;
  title: string | null;
  content: string | null;
  payloadJson: string | null;
};

export type StructureNoteResult = {
  summary: string | null;
  suggestions: SuggestedBlock[];
};

export const NoteStructuringService = {
  async structure(characterId: string, noteText: string) {
    const response = await apiClient.post<StructureNoteResult>(
      `/characters/${characterId}/notes/structure`,
      { noteText },
    );
    return response.data;
  },

  async importSheet(characterId: string, sheetText: string) {
    const response = await apiClient.post<StructureNoteResult>(
      `/characters/${characterId}/notes/import`,
      { sheetText },
    );
    return response.data;
  },
};
