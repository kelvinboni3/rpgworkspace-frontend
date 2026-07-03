import { apiClient } from "@/services/api-client";

export const WorkspaceRole = {
  Owner: 1,
  Master: 2,
  Player: 3,
} as const;

export type WorkspaceRoleValue = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRoleValue, string> = {
  [WorkspaceRole.Owner]: "Dono",
  [WorkspaceRole.Master]: "Mestre",
  [WorkspaceRole.Player]: "Jogador",
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: WorkspaceRoleValue;
  createdAt: string;
};

export const WorkspaceMemberService = {
  async getAllByWorkspace(workspaceId: string) {
    const response = await apiClient.get<WorkspaceMember[]>(
      `/workspaces/${workspaceId}/members`,
    );
    return response.data;
  },
};
