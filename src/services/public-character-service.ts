import { apiClient } from "@/services/api-client";
import type { CharacterStatusValue } from "@/services/character-service";
import type { BlockAccentColor, CharacterTabBlock } from "@/services/character-tab-block-service";

export type PublicCharacterTab = {
  name: string;
  blocks: CharacterTabBlock[];
};

export type PublicCharacter = {
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
  accentColor: BlockAccentColor | null;
  tabs: PublicCharacterTab[];
};

export const PublicCharacterService = {
  async getByToken(token: string) {
    const response = await apiClient.get<PublicCharacter>(`/public/characters/${token}`);
    return response.data;
  },
};
