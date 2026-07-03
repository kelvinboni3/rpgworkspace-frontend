import { apiClient } from "@/services/api-client";

export const NpcStatus = {
  Alive: 1,
  Dead: 2,
  Missing: 3,
  Unknown: 4,
} as const;

export type NpcStatusValue = (typeof NpcStatus)[keyof typeof NpcStatus];

export const NPC_STATUS_LABELS: Record<NpcStatusValue, string> = {
  [NpcStatus.Alive]: "Vivo",
  [NpcStatus.Dead]: "Morto",
  [NpcStatus.Missing]: "Desaparecido",
  [NpcStatus.Unknown]: "Desconhecido",
};

export type Npc = {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  status: NpcStatusValue;
  isPrivate: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateNpcRequest = {
  name: string;
  description?: string | null;
  status: NpcStatusValue;
  isPrivate: boolean;
  notes?: string | null;
};

export type UpdateNpcRequest = CreateNpcRequest;

export const NpcService = {
  async getAllByCampaign(campaignId: string) {
    const response = await apiClient.get<Npc[]>(`/campaigns/${campaignId}/npcs`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Npc>(`/npcs/${id}`);
    return response.data;
  },

  async create(campaignId: string, data: CreateNpcRequest) {
    const response = await apiClient.post<Npc>(`/campaigns/${campaignId}/npcs`, data);
    return response.data;
  },

  async update(id: string, data: UpdateNpcRequest) {
    const response = await apiClient.put<Npc>(`/npcs/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/npcs/${id}`);
  },
};
