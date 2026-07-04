import { apiClient } from "@/services/api-client";
import type { EvaluationLevelValue, ImportantPersonTypeValue } from "@/services/important-person-service";
import type { TheoryStatusValue } from "@/services/theory-service";

export const CharacterStatus = {
  Active: 1,
  Inactive: 2,
  Dead: 3,
  Retired: 4,
} as const;

export type CharacterStatusValue = (typeof CharacterStatus)[keyof typeof CharacterStatus];

export const CHARACTER_STATUS_LABELS: Record<CharacterStatusValue, string> = {
  [CharacterStatus.Active]: "Ativo",
  [CharacterStatus.Inactive]: "Inativo",
  [CharacterStatus.Dead]: "Morto",
  [CharacterStatus.Retired]: "Aposentado",
};

export type Character = {
  id: string;
  campaignId: string;
  userId: string;
  name: string;
  description: string | null;
  race: string | null;
  class: string | null;
  level: number;
  status: CharacterStatusValue;
  portraitUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateCharacterRequest = {
  userId: string;
  name: string;
  description?: string | null;
  race?: string | null;
  class?: string | null;
  level: number;
  status: CharacterStatusValue;
};

export type UpdateCharacterRequest = Omit<CreateCharacterRequest, "userId">;

export type CharacterDashboardLastPlayerNote = {
  id: string;
  title: string;
  createdAt: string;
};

export type CharacterDashboardTheory = {
  id: string;
  title: string;
  confidence: number;
  status: TheoryStatusValue;
};

export type CharacterDashboardOperation = {
  id: string;
  name: string;
  status: number;
};

export type CharacterDashboardImportantPerson = {
  id: string;
  name: string;
  type: ImportantPersonTypeValue;
  trustLevel: EvaluationLevelValue;
  riskLevel: EvaluationLevelValue;
  utilityLevel: EvaluationLevelValue;
};

export type CharacterDashboard = {
  characterId: string;
  characterName: string;
  campaignId: string;
  campaignName: string;
  lastPlayerNote: CharacterDashboardLastPlayerNote | null;
  activeTheoriesCount: number;
  activeOperationsCount: number;
  importantPeopleCount: number;
  narrativeItemsCount: number;
  recentNotes: CharacterDashboardLastPlayerNote[];
  activeTheories: CharacterDashboardTheory[];
  activeOperations: CharacterDashboardOperation[];
  importantPeopleHighlights: CharacterDashboardImportantPerson[];
};

export const CharacterService = {
  async getAllByCampaign(campaignId: string) {
    const response = await apiClient.get<Character[]>(`/campaigns/${campaignId}/characters`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Character>(`/characters/${id}`);
    return response.data;
  },

  async create(campaignId: string, data: CreateCharacterRequest) {
    const response = await apiClient.post<Character>(`/campaigns/${campaignId}/characters`, data);
    return response.data;
  },

  async update(id: string, data: UpdateCharacterRequest) {
    const response = await apiClient.put<Character>(`/characters/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/characters/${id}`);
  },

  async updatePortrait(id: string, portraitUrl: string | null) {
    const response = await apiClient.put<Character>(`/characters/${id}/portrait`, { portraitUrl });
    return response.data;
  },

  async getDashboard(characterId: string) {
    const response = await apiClient.get<CharacterDashboard>(
      `/characters/${characterId}/dashboard`,
    );
    return response.data;
  },
};
