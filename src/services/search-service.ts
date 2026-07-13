import { apiClient } from "@/services/api-client";

export type SearchResult = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string;
  isPrivate: boolean;
};

export const SearchService = {
  async searchCharacter(characterId: string, term: string) {
    const response = await apiClient.get<SearchResult[]>(`/characters/${characterId}/search`, {
      params: { term },
    });
    return response.data;
  },
};
