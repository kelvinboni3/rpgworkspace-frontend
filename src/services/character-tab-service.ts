import { apiClient } from "@/services/api-client";

export type CharacterTab = {
  id: string;
  characterId: string;
  name: string;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateCharacterTabRequest = {
  name: string;
};

export type UpdateCharacterTabRequest = CreateCharacterTabRequest;

export const CharacterTabService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<CharacterTab[]>(`/characters/${characterId}/tabs`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<CharacterTab>(`/character-tabs/${id}`);
    return response.data;
  },

  async create(characterId: string, data: CreateCharacterTabRequest) {
    const response = await apiClient.post<CharacterTab>(`/characters/${characterId}/tabs`, data);
    return response.data;
  },

  async update(id: string, data: UpdateCharacterTabRequest) {
    const response = await apiClient.put<CharacterTab>(`/character-tabs/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/character-tabs/${id}`);
  },
};
