import { apiClient } from "@/services/api-client";

export type CommunityRole = "Member" | "Admin";
export type CommunityChannelType = "Text" | "Voice";

export type CommunityMe = {
  userId: string;
  name: string;
  nickname: string | null;
  displayName: string;
  role: CommunityRole;
};

export type CommunityMember = {
  userId: string;
  displayName: string;
  role: CommunityRole;
};

export type CommunityChannel = {
  id: string;
  name: string;
  type: CommunityChannelType;
  category: string;
  topic: string | null;
  position: number;
  isReadOnly: boolean;
};

export type CommunityMessage = {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  clientNonce: string | null;
  // Só no front: mensagem otimista aguardando confirmação / que falhou ao enviar.
  pending?: boolean;
  failed?: boolean;
};

export type CreateCommunityChannelRequest = {
  name: string;
  type: CommunityChannelType;
  category: string;
  topic: string | null;
  isReadOnly: boolean;
};

export type UpdateCommunityChannelRequest = {
  name: string;
  category: string;
  topic: string | null;
  position: number;
  isReadOnly: boolean;
};

export type VoiceToken = {
  token: string;
  url: string;
  roomName: string;
};

export const MESSAGES_PAGE_SIZE = 50;
export const MESSAGE_MAX_LENGTH = 2000;

// O backend serializa enums como número por padrão; a Taverna já manda string, mas o
// POST precisa do número do enum CommunityChannelType (Text = 0, Voice = 1).
const CHANNEL_TYPE_TO_ENUM: Record<CommunityChannelType, number> = { Text: 0, Voice: 1 };

export const CommunityService = {
  async getMe() {
    const response = await apiClient.get<CommunityMe>("/community/me");
    return response.data;
  },
  async updateMe(nickname: string | null) {
    const response = await apiClient.put<CommunityMe>("/community/me", { nickname });
    return response.data;
  },
  async getMembers() {
    const response = await apiClient.get<CommunityMember[]>("/community/members");
    return response.data;
  },
  async getChannels() {
    const response = await apiClient.get<CommunityChannel[]>("/community/channels");
    return response.data;
  },
  async createChannel(request: CreateCommunityChannelRequest) {
    const response = await apiClient.post<CommunityChannel>("/community/channels", {
      ...request,
      type: CHANNEL_TYPE_TO_ENUM[request.type],
    });
    return response.data;
  },
  async updateChannel(channelId: string, request: UpdateCommunityChannelRequest) {
    const response = await apiClient.put<CommunityChannel>(`/community/channels/${channelId}`, request);
    return response.data;
  },
  async deleteChannel(channelId: string) {
    await apiClient.delete(`/community/channels/${channelId}`);
  },
  async getMessages(channelId: string, before?: string) {
    const response = await apiClient.get<CommunityMessage[]>(`/community/channels/${channelId}/messages`, {
      params: { before, limit: MESSAGES_PAGE_SIZE },
    });
    return response.data;
  },
  async sendMessage(channelId: string, content: string, clientNonce: string) {
    const response = await apiClient.post<CommunityMessage>(`/community/channels/${channelId}/messages`, {
      content,
      clientNonce,
    });
    return response.data;
  },
  async editMessage(messageId: string, content: string) {
    const response = await apiClient.put<CommunityMessage>(`/community/messages/${messageId}`, { content });
    return response.data;
  },
  async deleteMessage(messageId: string) {
    await apiClient.delete(`/community/messages/${messageId}`);
  },
  async getVoiceToken(channelId: string) {
    const response = await apiClient.post<VoiceToken>(`/community/channels/${channelId}/voice-token`);
    return response.data;
  },
};

export const communityKeys = {
  me: ["community", "me"] as const,
  members: ["community", "members"] as const,
  channels: ["community", "channels"] as const,
  messages: (channelId: string) => ["community", "messages", channelId] as const,
};
