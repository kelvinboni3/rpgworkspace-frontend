import { apiClient } from "@/services/api-client";

export const ImportantPersonType = {
  Npc: 1,
  PlayerCharacter: 2,
  Faction: 3,
  Creature: 4,
  Organization: 5,
  Other: 6,
} as const;

export type ImportantPersonTypeValue =
  (typeof ImportantPersonType)[keyof typeof ImportantPersonType];

export const IMPORTANT_PERSON_TYPE_LABELS: Record<ImportantPersonTypeValue, string> = {
  [ImportantPersonType.Npc]: "NPC",
  [ImportantPersonType.PlayerCharacter]: "Personagem de jogador",
  [ImportantPersonType.Faction]: "Facção",
  [ImportantPersonType.Creature]: "Criatura",
  [ImportantPersonType.Organization]: "Organização",
  [ImportantPersonType.Other]: "Outro",
};

export const EvaluationLevel = {
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type EvaluationLevelValue = (typeof EvaluationLevel)[keyof typeof EvaluationLevel];

export const EVALUATION_LEVEL_LABELS: Record<EvaluationLevelValue, string> = {
  [EvaluationLevel.None]: "Nenhum",
  [EvaluationLevel.Low]: "Baixo",
  [EvaluationLevel.Medium]: "Médio",
  [EvaluationLevel.High]: "Alto",
  [EvaluationLevel.Critical]: "Crítico",
};

export type ImportantPerson = {
  id: string;
  characterId: string;
  name: string;
  type: ImportantPersonTypeValue;
  firstImpression: string | null;
  analysis: string | null;
  trustLevel: EvaluationLevelValue;
  riskLevel: EvaluationLevelValue;
  utilityLevel: EvaluationLevelValue;
  notes: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateImportantPersonRequest = {
  name: string;
  type: ImportantPersonTypeValue;
  firstImpression?: string | null;
  analysis?: string | null;
  trustLevel: EvaluationLevelValue;
  riskLevel: EvaluationLevelValue;
  utilityLevel: EvaluationLevelValue;
  notes?: string | null;
  lastContactAt?: string | null;
};

export type UpdateImportantPersonRequest = CreateImportantPersonRequest;

export const ImportantPersonService = {
  async getAllByCharacter(characterId: string) {
    const response = await apiClient.get<ImportantPerson[]>(
      `/characters/${characterId}/important-people`,
    );
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<ImportantPerson>(`/important-people/${id}`);
    return response.data;
  },

  async create(characterId: string, data: CreateImportantPersonRequest) {
    const response = await apiClient.post<ImportantPerson>(
      `/characters/${characterId}/important-people`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateImportantPersonRequest) {
    const response = await apiClient.put<ImportantPerson>(`/important-people/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/important-people/${id}`);
  },
};
