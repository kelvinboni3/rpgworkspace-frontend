import { apiClient } from "@/services/api-client";

export type BookVolume = {
  id: string;
  characterTabBlockId: string;
  order: number;
  originalFileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  createdAt: string;
  updatedAt: string | null;
};

export const BookVolumeService = {
  async getAllByBlock(characterTabBlockId: string) {
    const response = await apiClient.get<BookVolume[]>(
      `/character-tab-blocks/${characterTabBlockId}/book-volumes`,
    );
    return response.data;
  },

  async upload(characterTabBlockId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<BookVolume>(
      `/character-tab-blocks/${characterTabBlockId}/book-volumes`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async reorder(characterTabBlockId: string, orderedVolumeIds: string[]) {
    const response = await apiClient.put<BookVolume[]>(
      `/character-tab-blocks/${characterTabBlockId}/book-volumes/reorder`,
      { orderedVolumeIds },
    );
    return response.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/book-volumes/${id}`);
  },
};
