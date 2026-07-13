import { apiClient } from "@/services/api-client";
import type { BlockAccentColor, CharacterTabBlockTypeValue } from "@/services/character-tab-block-service";

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
  campaignId: string | null;
  userId: string;
  name: string;
  description: string | null;
  race: string | null;
  class: string | null;
  level: number;
  status: CharacterStatusValue;
  portraitUrl: string | null;
  hpCurrent: number | null;
  hpMax: number | null;
  mpCurrent: number | null;
  mpMax: number | null;
  retrospectiveText: string | null;
  recapText: string | null;
  recapGeneratedAt: string | null;
  accentColor: BlockAccentColor | null;
  createdAt: string;
  updatedAt: string | null;
};

export type UpdateCharacterVitalsRequest = {
  hpCurrent: number | null;
  hpMax: number | null;
  mpCurrent: number | null;
  mpMax: number | null;
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

export type CreateSoloCharacterRequest = Omit<CreateCharacterRequest, "userId">;

export type CreateCharacterWithAccountRequest = {
  playerName: string;
  email: string;
  password: string;
  characterName: string;
  description?: string | null;
  race?: string | null;
  class?: string | null;
  level: number;
  status: CharacterStatusValue;
};

export type CharacterWithAccountResponse = {
  character: Character;
  userId: string;
  playerName: string;
  email: string;
};

export type CharacterDashboardTabSummary = {
  tabId: string;
  tabName: string;
  blockCount: number;
};

export type CharacterDashboardRecentBlock = {
  id: string;
  tabId: string;
  tabName: string;
  type: CharacterTabBlockTypeValue;
  title: string | null;
  updatedAt: string;
};

export type CharacterDashboard = {
  characterId: string;
  characterName: string;
  campaignId: string | null;
  campaignName: string | null;
  tabSummaries: CharacterDashboardTabSummary[];
  recentBlocks: CharacterDashboardRecentBlock[];
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

  async getMine() {
    const response = await apiClient.get<Character[]>(`/characters/mine`);
    return response.data;
  },

  async createSolo(data: CreateSoloCharacterRequest) {
    const response = await apiClient.post<Character>(`/characters/solo`, data);
    return response.data;
  },

  async create(campaignId: string, data: CreateCharacterRequest) {
    const response = await apiClient.post<Character>(`/campaigns/${campaignId}/characters`, data);
    return response.data;
  },

  async createWithAccount(campaignId: string, data: CreateCharacterWithAccountRequest) {
    const response = await apiClient.post<CharacterWithAccountResponse>(
      `/campaigns/${campaignId}/characters/with-account`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateCharacterRequest) {
    const response = await apiClient.put<Character>(`/characters/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/characters/${id}`);
  },

  async uploadPortrait(id: string, file: Blob) {
    const formData = new FormData();
    formData.append("file", file, "portrait.jpg");

    const response = await apiClient.post<Character>(`/characters/${id}/portrait`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async removePortrait(id: string) {
    const response = await apiClient.delete<Character>(`/characters/${id}/portrait`);
    return response.data;
  },

  async updateVitals(id: string, data: UpdateCharacterVitalsRequest) {
    const response = await apiClient.put<Character>(`/characters/${id}/vitals`, data);
    return response.data;
  },

  async getDashboard(characterId: string) {
    const response = await apiClient.get<CharacterDashboard>(
      `/characters/${characterId}/dashboard`,
    );
    return response.data;
  },

  async updateAccentColor(id: string, accentColor: BlockAccentColor | null) {
    const response = await apiClient.put<Character>(`/characters/${id}/accent-color`, { accentColor });
    return response.data;
  },

  async exportMarkdown(characterId: string) {
    const response = await apiClient.get<Blob>(`/characters/${characterId}/export/markdown`, {
      responseType: "blob",
    });
    return response.data;
  },
};
