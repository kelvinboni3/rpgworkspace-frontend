import { apiClient } from "@/services/api-client";

export const QuestStatus = {
  NotStarted: 1,
  InProgress: 2,
  Completed: 3,
  Failed: 4,
  Abandoned: 5,
} as const;

export type QuestStatusValue = (typeof QuestStatus)[keyof typeof QuestStatus];

export const QUEST_STATUS_LABELS: Record<QuestStatusValue, string> = {
  [QuestStatus.NotStarted]: "Não iniciada",
  [QuestStatus.InProgress]: "Em andamento",
  [QuestStatus.Completed]: "Concluída",
  [QuestStatus.Failed]: "Falhou",
  [QuestStatus.Abandoned]: "Abandonada",
};

export type Quest = {
  id: string;
  campaignId: string;
  title: string;
  description: string | null;
  status: QuestStatusValue;
  reward: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateQuestRequest = {
  title: string;
  description?: string | null;
  status: QuestStatusValue;
  reward?: string | null;
  isPrivate: boolean;
};

export type UpdateQuestRequest = CreateQuestRequest;

export const QuestService = {
  async getAllByCampaign(campaignId: string) {
    const response = await apiClient.get<Quest[]>(`/campaigns/${campaignId}/quests`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Quest>(`/quests/${id}`);
    return response.data;
  },

  async create(campaignId: string, data: CreateQuestRequest) {
    const response = await apiClient.post<Quest>(`/campaigns/${campaignId}/quests`, data);
    return response.data;
  },

  async update(id: string, data: UpdateQuestRequest) {
    const response = await apiClient.put<Quest>(`/quests/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/quests/${id}`);
  },
};
