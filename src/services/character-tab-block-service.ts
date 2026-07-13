import { apiClient } from "@/services/api-client";

export const CharacterTabBlockType = {
  Text: 1,
  Quote: 2,
  Card: 3,
  Table: 4,
  Image: 5,
  Divider: 6,
  Collapse: 7,
  Book: 8,
  Dice: 9,
} as const;

export type CharacterTabBlockTypeValue =
  (typeof CharacterTabBlockType)[keyof typeof CharacterTabBlockType];

export const CHARACTER_TAB_BLOCK_TYPE_LABELS: Record<CharacterTabBlockTypeValue, string> = {
  [CharacterTabBlockType.Text]: "Texto",
  [CharacterTabBlockType.Quote]: "Citação",
  [CharacterTabBlockType.Card]: "Card de atributos",
  [CharacterTabBlockType.Table]: "Tabela",
  [CharacterTabBlockType.Image]: "Imagem",
  [CharacterTabBlockType.Divider]: "Divisor",
  [CharacterTabBlockType.Collapse]: "Registro expansível",
  [CharacterTabBlockType.Book]: "Livro",
  [CharacterTabBlockType.Dice]: "Rolador de Dados",
};

export const BLOCK_ACCENT_COLORS = ["gold", "crimson", "violet"] as const;
export type BlockAccentColor = (typeof BLOCK_ACCENT_COLORS)[number];

export const BLOCK_ACCENT_COLOR_LABELS: Record<BlockAccentColor, string> = {
  gold: "Dourado",
  crimson: "Carmesim",
  violet: "Violeta",
};

export type CharacterTabBlock = {
  id: string;
  characterTabId: string;
  parentBlockId: string | null;
  type: CharacterTabBlockTypeValue;
  order: number;
  title: string | null;
  meta: string | null;
  content: string | null;
  payloadJson: string | null;
  accentColor: BlockAccentColor | null;
  imageUrl: string | null;
  children: CharacterTabBlock[];
  createdAt: string;
  updatedAt: string | null;
};

export type CardBlockPayload = {
  rows: { k: string; v: string }[];
};

export type TableBlockPayload = {
  headers: string[];
  rows: string[][];
};

export const IMAGE_BLOCK_SIZES = ["small", "medium", "large", "original"] as const;
export type ImageBlockSize = (typeof IMAGE_BLOCK_SIZES)[number];

export const IMAGE_BLOCK_SIZE_LABELS: Record<ImageBlockSize, string> = {
  small: "Pequena",
  medium: "Média",
  large: "Grande",
  original: "Largura total",
};

export const IMAGE_BLOCK_POSITIONS = ["left", "center", "right"] as const;
export type ImageBlockPosition = (typeof IMAGE_BLOCK_POSITIONS)[number];

export const IMAGE_BLOCK_POSITION_LABELS: Record<ImageBlockPosition, string> = {
  left: "Esquerda",
  center: "Centro",
  right: "Direita",
};

export type ImageBlockPayload = {
  url: string;
  caption: string;
  size: ImageBlockSize;
  /** Custom width as a percentage (15-100) of the block column, set by dragging the resize handle. Overrides `size` when present. */
  width?: number;
  /** Alignment within the tab column. "left"/"right" float the image so child blocks (e.g. a Text block) wrap beside it. */
  position: ImageBlockPosition;
};

export type BookBlockPayload = {
  coverCaption: string;
};

export type CreateCharacterTabBlockRequest = {
  type: CharacterTabBlockTypeValue;
  title?: string | null;
  meta?: string | null;
  content?: string | null;
  payloadJson?: string | null;
  accentColor?: BlockAccentColor | null;
};

export type UpdateCharacterTabBlockRequest = {
  title?: string | null;
  meta?: string | null;
  content?: string | null;
  payloadJson?: string | null;
};

export type MoveDirection = "up" | "down";

export type CharacterTabBlockBacklink = {
  blockId: string;
  blockTitle: string | null;
  characterTabId: string;
  characterTabName: string;
};

export const CharacterTabBlockService = {
  async getAllByTab(characterTabId: string) {
    const response = await apiClient.get<CharacterTabBlock[]>(
      `/character-tabs/${characterTabId}/blocks`,
    );
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<CharacterTabBlock>(`/character-tab-blocks/${id}`);
    return response.data;
  },

  async getBacklinks(id: string) {
    const response = await apiClient.get<CharacterTabBlockBacklink[]>(
      `/character-tab-blocks/${id}/backlinks`,
    );
    return response.data;
  },

  async create(characterTabId: string, data: CreateCharacterTabBlockRequest) {
    const response = await apiClient.post<CharacterTabBlock>(
      `/character-tabs/${characterTabId}/blocks`,
      data,
    );
    return response.data;
  },

  async createChild(parentBlockId: string, data: CreateCharacterTabBlockRequest) {
    const response = await apiClient.post<CharacterTabBlock>(
      `/character-tab-blocks/${parentBlockId}/children`,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateCharacterTabBlockRequest) {
    const response = await apiClient.put<CharacterTabBlock>(`/character-tab-blocks/${id}`, data);
    return response.data;
  },

  async updateAccentColor(id: string, accentColor: BlockAccentColor | null) {
    const response = await apiClient.put<CharacterTabBlock>(`/character-tab-blocks/${id}/accent-color`, {
      accentColor,
    });
    return response.data;
  },

  async move(id: string, direction: MoveDirection) {
    const response = await apiClient.put<CharacterTabBlock[]>(
      `/character-tab-blocks/${id}/move`,
      { direction },
    );
    return response.data;
  },

  async reorder(characterTabId: string, orderedBlockIds: string[]) {
    const response = await apiClient.put<CharacterTabBlock[]>(
      `/character-tabs/${characterTabId}/blocks/reorder`,
      { orderedBlockIds },
    );
    return response.data;
  },

  async reorderChildren(parentBlockId: string, orderedBlockIds: string[]) {
    const response = await apiClient.put<CharacterTabBlock[]>(
      `/character-tab-blocks/${parentBlockId}/children/reorder`,
      { orderedBlockIds },
    );
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/character-tab-blocks/${id}`);
  },

  async uploadImage(id: string, file: Blob) {
    const formData = new FormData();
    formData.append("file", file, "image.jpg");

    const response = await apiClient.post<CharacterTabBlock>(`/character-tab-blocks/${id}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  async removeImage(id: string) {
    const response = await apiClient.delete<CharacterTabBlock>(`/character-tab-blocks/${id}/image`);
    return response.data;
  },
};
