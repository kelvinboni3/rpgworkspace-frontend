import { apiClient } from "@/services/api-client";
import type { Tag } from "@/services/tag-types";

export const NarrativeItemImportance = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type NarrativeItemImportanceValue =
  (typeof NarrativeItemImportance)[keyof typeof NarrativeItemImportance];

export const NARRATIVE_ITEM_IMPORTANCE_LABELS: Record<NarrativeItemImportanceValue, string> = {
  [NarrativeItemImportance.Low]: "Baixa",
  [NarrativeItemImportance.Medium]: "Média",
  [NarrativeItemImportance.High]: "Alta",
  [NarrativeItemImportance.Critical]: "Crítica",
};

export type NarrativeItem = {
  id: string;
  characterId: string;
  name: string;
  description: string | null;
  origin: string | null;
  sessionId: string | null;
  importance: NarrativeItemImportanceValue;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags: Tag[];
};

export type CreateNarrativeItemRequest = {
  name: string;
  description?: string | null;
  origin?: string | null;
  sessionId?: string | null;
  importance: NarrativeItemImportanceValue;
  notes?: string | null;
};

export type UpdateNarrativeItemRequest = CreateNarrativeItemRequest;

export const NarrativeItemService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<NarrativeItem[]>(
      `/characters/${characterId}/narrative-items`,
    );
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<NarrativeItem>(`/narrative-items/${id}`);
    return response.data;
  },

  async create(characterId: string, data: CreateNarrativeItemRequest) {
    const response = await apiClient.post<NarrativeItem>(
      `/characters/${characterId}/narrative-items`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateNarrativeItemRequest) {
    const response = await apiClient.put<NarrativeItem>(`/narrative-items/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/narrative-items/${id}`);
  },
};
