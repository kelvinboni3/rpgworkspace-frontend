import { apiClient } from "@/services/api-client";

export type AiUsageStatus = {
  used: number;
  limit: number;
  remaining: number;
  periodEndUtc: string;
};

export const AiUsageService = {
  async getMine() {
    const response = await apiClient.get<AiUsageStatus>("/ai/usage");
    return response.data;
  },
};
