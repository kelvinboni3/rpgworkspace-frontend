import { apiClient } from "@/services/api-client";

export type CharacterRecapResponse = {
  recap: string;
  generatedAt: string;
};

export type CharacterRetrospectiveResponse = {
  retrospective: string;
};

export type CharacterMemoryResponse = {
  blockId: string;
  tabId: string;
  tabName: string;
  title: string | null;
  content: string;
  createdAt: string;
};

export const CharacterNarrativeService = {
  async generateRecap(characterId: string) {
    const response = await apiClient.post<CharacterRecapResponse>(
      `/characters/${characterId}/recap`,
    );
    return response.data;
  },

  async generateRetrospective(characterId: string) {
    const response = await apiClient.post<CharacterRetrospectiveResponse>(
      `/characters/${characterId}/retrospective`,
    );
    return response.data;
  },

  async getMemory(characterId: string) {
    const response = await apiClient.get<CharacterMemoryResponse | null>(
      `/characters/${characterId}/memory`,
    );
    return response.data;
  },
};
