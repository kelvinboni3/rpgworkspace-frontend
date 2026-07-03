import { apiClient } from "@/services/api-client";

export type Campaign = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  systemName: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateCampaignRequest = {
  name: string;
  description?: string | null;
  systemName?: string | null;
};

export type UpdateCampaignRequest = CreateCampaignRequest;

export const CampaignService = {
  async getAllByWorkspace(workspaceId: string) {
    const response = await apiClient.get<Campaign[]>(
      `/workspaces/${workspaceId}/campaigns`,
    );
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  },

  async create(workspaceId: string, data: CreateCampaignRequest) {
    const response = await apiClient.post<Campaign>(
      `/workspaces/${workspaceId}/campaigns`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateCampaignRequest) {
    const response = await apiClient.put<Campaign>(`/campaigns/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/campaigns/${id}`);
  },
};
