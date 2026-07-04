import { apiClient } from "@/services/api-client";
import type { Tag } from "@/services/tag-types";

export type PlayerNote = {
  id: string;
  characterId: string;
  sessionId: string | null;
  title: string;
  content: string;
  tagsText: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags: Tag[];
};

export type CreatePlayerNoteRequest = {
  sessionId?: string | null;
  title: string;
  content: string;
};

export type UpdatePlayerNoteRequest = CreatePlayerNoteRequest;

export const PlayerNoteService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<PlayerNote[]>(`/characters/${characterId}/notes`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<PlayerNote>(`/player-notes/${id}`);
    return response.data;
  },

  async create(characterId: string, data: CreatePlayerNoteRequest) {
    const response = await apiClient.post<PlayerNote>(
      `/characters/${characterId}/notes`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdatePlayerNoteRequest) {
    const response = await apiClient.put<PlayerNote>(`/player-notes/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/player-notes/${id}`);
  },
};
