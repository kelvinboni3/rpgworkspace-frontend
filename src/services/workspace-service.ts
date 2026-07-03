import { apiClient } from "@/services/api-client";

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateWorkspaceRequest = {
  name: string;
  description?: string | null;
};

export type UpdateWorkspaceRequest = CreateWorkspaceRequest;

export const WorkspaceService = {
  async getAll() {
    const response = await apiClient.get<Workspace[]>("/workspaces");
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Workspace>(`/workspaces/${id}`);
    return response.data;
  },

  async create(data: CreateWorkspaceRequest) {
    const response = await apiClient.post<Workspace>("/workspaces", data);
    return response.data;
  },

  async update(id: string, data: UpdateWorkspaceRequest) {
    const response = await apiClient.put<Workspace>(`/workspaces/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/workspaces/${id}`);
  },
};
