import { apiClient } from "@/services/api-client";
import type { Tag } from "@/services/tag-types";

export const OperationStatus = {
  Planned: 1,
  InProgress: 2,
  Completed: 3,
  Failed: 4,
  Canceled: 5,
  Archived: 6,
} as const;

export type OperationStatusValue = (typeof OperationStatus)[keyof typeof OperationStatus];

export const OPERATION_STATUS_LABELS: Record<OperationStatusValue, string> = {
  [OperationStatus.Planned]: "Planejada",
  [OperationStatus.InProgress]: "Em andamento",
  [OperationStatus.Completed]: "Concluída",
  [OperationStatus.Failed]: "Fracassada",
  [OperationStatus.Canceled]: "Cancelada",
  [OperationStatus.Archived]: "Arquivada",
};

export type Operation = {
  id: string;
  characterId: string;
  name: string;
  objective: string | null;
  plan: string | null;
  requiredResources: string | null;
  risks: string | null;
  status: OperationStatusValue;
  result: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags: Tag[];
};

export type CreateOperationRequest = {
  name: string;
  objective?: string | null;
  plan?: string | null;
  requiredResources?: string | null;
  risks?: string | null;
  status: OperationStatusValue;
  result?: string | null;
};

export type UpdateOperationRequest = CreateOperationRequest;

export const OperationService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<Operation[]>(`/characters/${characterId}/operations`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Operation>(`/operations/${id}`);
    return response.data;
  },

  async create(characterId: string, data: CreateOperationRequest) {
    const response = await apiClient.post<Operation>(
      `/characters/${characterId}/operations`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateOperationRequest) {
    const response = await apiClient.put<Operation>(`/operations/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/operations/${id}`);
  },
};
