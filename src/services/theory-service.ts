import { apiClient } from "@/services/api-client";
import type { Tag } from "@/services/tag-types";

export const TheoryStatus = {
  Active: 1,
  Confirmed: 2,
  Refuted: 3,
  Archived: 4,
} as const;

export type TheoryStatusValue = (typeof TheoryStatus)[keyof typeof TheoryStatus];

export const THEORY_STATUS_LABELS: Record<TheoryStatusValue, string> = {
  [TheoryStatus.Active]: "Ativa",
  [TheoryStatus.Confirmed]: "Confirmada",
  [TheoryStatus.Refuted]: "Refutada",
  [TheoryStatus.Archived]: "Arquivada",
};

export type Theory = {
  id: string;
  characterId: string;
  title: string;
  description: string | null;
  evidence: string | null;
  confidence: number;
  status: TheoryStatusValue;
  createdAt: string;
  updatedAt: string | null;
  tags: Tag[];
};

export type CreateTheoryRequest = {
  title: string;
  description?: string | null;
  evidence?: string | null;
  confidence: number;
  status: TheoryStatusValue;
};

export type UpdateTheoryRequest = CreateTheoryRequest;

export const TheoryService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<Theory[]>(`/characters/${characterId}/theories`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Theory>(`/theories/${id}`);
    return response.data;
  },

  async create(characterId: string, data: CreateTheoryRequest) {
    const response = await apiClient.post<Theory>(`/characters/${characterId}/theories`, data);
    return response.data;
  },

  async update(id: string, data: UpdateTheoryRequest) {
    const response = await apiClient.put<Theory>(`/theories/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/theories/${id}`);
  },
};
