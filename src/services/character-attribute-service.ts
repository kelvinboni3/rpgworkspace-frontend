import { apiClient } from "@/services/api-client";

export type CharacterAttribute = {
  id: string;
  characterId: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateCharacterAttributeRequest = {
  name: string;
  value: string;
};

export type UpdateCharacterAttributeRequest = CreateCharacterAttributeRequest;

export const CharacterAttributeService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<CharacterAttribute[]>(
      `/characters/${characterId}/attributes`,
    );
    return response.data;
  },

  async create(characterId: string, data: CreateCharacterAttributeRequest) {
    const response = await apiClient.post<CharacterAttribute>(
      `/characters/${characterId}/attributes`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateCharacterAttributeRequest) {
    const response = await apiClient.put<CharacterAttribute>(
      `/character-attributes/${id}`,
      data,
    );
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/character-attributes/${id}`);
  },
};
