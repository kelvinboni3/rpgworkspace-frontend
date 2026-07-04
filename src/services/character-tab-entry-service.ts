import { apiClient } from "@/services/api-client";

export type CharacterTabEntry = {
  id: string;
  characterTabId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateCharacterTabEntryRequest = {
  title: string;
  content: string;
};

export type UpdateCharacterTabEntryRequest = CreateCharacterTabEntryRequest;

export const CharacterTabEntryService = {
  async getAllByTab(characterTabId: string) {
    const response = await apiClient.get<CharacterTabEntry[]>(
      `/character-tabs/${characterTabId}/entries`,
    );
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<CharacterTabEntry>(`/character-tab-entries/${id}`);
    return response.data;
  },

  async create(characterTabId: string, data: CreateCharacterTabEntryRequest) {
    const response = await apiClient.post<CharacterTabEntry>(
      `/character-tabs/${characterTabId}/entries`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateCharacterTabEntryRequest) {
    const response = await apiClient.put<CharacterTabEntry>(`/character-tab-entries/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/character-tab-entries/${id}`);
  },
};
