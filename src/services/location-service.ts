import { apiClient } from "@/services/api-client";

export const LocationType = {
  City: 1,
  Kingdom: 2,
  Dungeon: 3,
  School: 4,
  Tavern: 5,
  Region: 6,
  Forest: 7,
  Temple: 8,
  Other: 9,
} as const;

export type LocationTypeValue = (typeof LocationType)[keyof typeof LocationType];

export const LOCATION_TYPE_LABELS: Record<LocationTypeValue, string> = {
  [LocationType.City]: "Cidade",
  [LocationType.Kingdom]: "Reino",
  [LocationType.Dungeon]: "Masmorra",
  [LocationType.School]: "Escola",
  [LocationType.Tavern]: "Taverna",
  [LocationType.Region]: "Região",
  [LocationType.Forest]: "Floresta",
  [LocationType.Temple]: "Templo",
  [LocationType.Other]: "Outro",
};

export const ImportanceLevel = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type ImportanceLevelValue = (typeof ImportanceLevel)[keyof typeof ImportanceLevel];

export const IMPORTANCE_LEVEL_LABELS: Record<ImportanceLevelValue, string> = {
  [ImportanceLevel.Low]: "Baixa",
  [ImportanceLevel.Medium]: "Média",
  [ImportanceLevel.High]: "Alta",
  [ImportanceLevel.Critical]: "Crítica",
};

export type Location = {
  id: string;
  campaignId: string;
  name: string;
  type: LocationTypeValue;
  description: string | null;
  region: string | null;
  importance: ImportanceLevelValue;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type CreateLocationRequest = {
  name: string;
  type: LocationTypeValue;
  description?: string | null;
  region?: string | null;
  importance: ImportanceLevelValue;
  isPrivate: boolean;
};

export type UpdateLocationRequest = CreateLocationRequest;

export const LocationService = {
  async getAllByCampaign(campaignId: string) {
    const response = await apiClient.get<Location[]>(`/campaigns/${campaignId}/locations`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Location>(`/locations/${id}`);
    return response.data;
  },

  async create(campaignId: string, data: CreateLocationRequest) {
    const response = await apiClient.post<Location>(`/campaigns/${campaignId}/locations`, data);
    return response.data;
  },

  async update(id: string, data: UpdateLocationRequest) {
    const response = await apiClient.put<Location>(`/locations/${id}`, data);
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/locations/${id}`);
  },
};
