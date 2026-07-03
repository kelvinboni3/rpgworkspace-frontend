import { apiClient } from "@/services/api-client";

export const SessionStatus = {
  Planned: 1,
  Completed: 2,
  Canceled: 3,
} as const;

export type SessionStatusValue = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SESSION_STATUS_LABELS: Record<SessionStatusValue, string> = {
  [SessionStatus.Planned]: "Planejada",
  [SessionStatus.Completed]: "Concluída",
  [SessionStatus.Canceled]: "Cancelada",
};

export type Session = {
  id: string;
  campaignId: string;
  title: string;
  number: number;
  date: string;
  summary: string | null;
  notes: string | null;
  status: SessionStatusValue;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateSessionRequest = {
  title: string;
  number: number;
  date: string;
  summary?: string | null;
  notes?: string | null;
  status: SessionStatusValue;
};

export type UpdateSessionRequest = CreateSessionRequest;

export const SessionService = {
  async getAllByCampaign(campaignId: string) {
    const response = await apiClient.get<Session[]>(`/campaigns/${campaignId}/sessions`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Session>(`/sessions/${id}`);
    return response.data;
  },

  async create(campaignId: string, data: CreateSessionRequest) {
    const response = await apiClient.post<Session>(`/campaigns/${campaignId}/sessions`, data);
    return response.data;
  },

  async update(id: string, data: UpdateSessionRequest) {
    const response = await apiClient.put<Session>(`/sessions/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/sessions/${id}`);
  },
};
