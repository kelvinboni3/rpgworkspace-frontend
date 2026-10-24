import { createContext } from "react";
import type { Room } from "livekit-client";
import type { CommunityMe } from "@/services/community-service";

export type HubStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export type VoiceState = {
  userId: string;
  channelId: string;
  muted: boolean;
  deafened: boolean;
  streaming: boolean;
};

export type PresenceSnapshot = {
  onlineUserIds: string[];
  voice: VoiceState[];
};

/** smooth = jogos/vídeo (1080p30, segura o FPS); sharp = texto/mapas/fichas (1080p15, segura a nitidez). */
export type ScreenShareMode = "smooth" | "sharp";

export type VoiceConnection = {
  channelId: string;
  room: Room;
  status: "connecting" | "connected" | "reconnecting";
};

export type TavernaContextValue = {
  /** null enquanto carrega; false = usuário sem acesso (menu escondido). */
  me: CommunityMe | null | false;
  isAdmin: boolean;
  hubStatus: HubStatus;
  presence: PresenceSnapshot;
  /** channelId → userIds digitando agora. */
  typing: Record<string, string[]>;
  unreadChannelIds: Set<string>;
  setActiveTextChannel: (channelId: string | null) => void;
  sendTyping: (channelId: string) => void;

  voice: VoiceConnection | null;
  /** Incrementa a cada evento do LiveKit — componentes que leem a Room dependem disto para re-renderizar. */
  voiceVersion: number;
  speakingIds: Set<string>;
  micMuted: boolean;
  deafened: boolean;
  voiceError: string | null;
  canPlaybackAudio: boolean;
  joinVoice: (channelId: string) => Promise<void>;
  leaveVoice: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  screenShareMode: ScreenShareMode;
  setScreenShareMode: (mode: ScreenShareMode) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  startAudio: () => Promise<void>;
  clearVoiceError: () => void;
};

export const TavernaContext = createContext<TavernaContextValue | null>(null);
