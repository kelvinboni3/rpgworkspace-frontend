import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { isAxiosError } from "axios";
// Só tipos aqui: o livekit-client (~400 kB) é importado sob demanda ao entrar na voz, para não pesar
// no bundle de quem nem tem acesso à Taverna.
import type {
  DisconnectReason,
  LocalTrackPublication,
  Participant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
} from "livekit-client";
import {
  TavernaContext,
  type HubStatus,
  type PresenceSnapshot,
  type ScreenShareMode,
  type TavernaContextValue,
  type VoiceConnection,
} from "@/components/taverna/taverna-context";
import { patchMessage, removeMessage, upsertMessage } from "@/components/taverna/message-cache";
import { createCommunityHub } from "@/services/community-hub";
import { CommunityService, communityKeys, type CommunityMessage } from "@/services/community-service";
import { authStore } from "@/store/auth-store";

const EMPTY_PRESENCE: PresenceSnapshot = { onlineUserIds: [], voice: [] };
const TYPING_TTL_MS = 6000;
const TYPING_THROTTLE_MS = 3000;
const SCREEN_SHARE_MODE_KEY = "taverna-screen-share-mode";

function readScreenShareMode(): ScreenShareMode {
  try {
    return localStorage.getItem(SCREEN_SHARE_MODE_KEY) === "sharp" ? "sharp" : "smooth";
  } catch {
    return "smooth";
  }
}

/**
 * Estado global da Taverna: conexão SignalR (mensagens/presença/digitando) e a sala de voz do
 * LiveKit. Fica no AppLayout — e não na página — para a voz continuar conectada enquanto a pessoa
 * navega pelo resto do app (ex.: abre a ficha do personagem no meio da sessão).
 * Só conecta qualquer coisa se GET /community/me responder 200.
 */
export function TavernaProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const isAuthenticated = authStore.isAuthenticated();

  const meQuery = useQuery({
    queryKey: communityKeys.me,
    queryFn: CommunityService.getMe,
    enabled: isAuthenticated,
    retry: (failureCount, error) =>
      !(isAxiosError(error) && error.response?.status === 404) && failureCount < 2,
    staleTime: 1000 * 60 * 10,
  });
  const me = !isAuthenticated ? false : meQuery.isPending ? null : (meQuery.data ?? false);
  const meUserId = me ? me.userId : null;

  // ── Hub (SignalR) ─────────────────────────────────────────────────────────
  const hubRef = useRef<HubConnection | null>(null);
  const [hubStatus, setHubStatus] = useState<HubStatus>("idle");
  const [presence, setPresence] = useState<PresenceSnapshot>(EMPTY_PRESENCE);
  const [typingMap, setTypingMap] = useState<Record<string, Record<string, number>>>({});
  const [unreadChannelIds, setUnreadChannelIds] = useState<Set<string>>(() => new Set());
  const activeTextChannelRef = useRef<string | null>(null);
  const lastTypingSentRef = useRef<Record<string, number>>({});

  // ── Voz (LiveKit) ─────────────────────────────────────────────────────────
  const roomRef = useRef<Room | null>(null);
  const [voice, setVoice] = useState<VoiceConnection | null>(null);
  const [voiceVersion, bumpVoice] = useReducer((n: number) => n + 1, 0);
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(() => new Set());
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);
  const audioElementsRef = useRef(new Map<string, HTMLMediaElement>());
  const voiceStateRef = useRef({ channelId: null as string | null, micMuted: false, deafened: false });
  const mutedBeforeDeafenRef = useRef(false);
  const [screenShareMode, setScreenShareModeState] = useState<ScreenShareMode>(readScreenShareMode);

  const setScreenShareMode = useCallback((mode: ScreenShareMode) => {
    setScreenShareModeState(mode);
    try {
      localStorage.setItem(SCREEN_SHARE_MODE_KEY, mode);
    } catch {
      // Preferência só não fica salva — segue funcionando.
    }
  }, []);

  useEffect(() => {
    voiceStateRef.current = { channelId: voice?.channelId ?? null, micMuted, deafened };
  }, [voice?.channelId, micMuted, deafened]);

  const invokeHub = useCallback(async <T,>(method: string, ...args: unknown[]) => {
    const hub = hubRef.current;
    if (!hub || hub.state !== HubConnectionState.Connected) return undefined;
    try {
      return await hub.invoke<T>(method, ...args);
    } catch {
      return undefined;
    }
  }, []);

  const publishVoiceState = useCallback(() => {
    const { channelId, micMuted: muted, deafened: deaf } = voiceStateRef.current;
    void invokeHub("UpdateVoiceState", channelId, muted, deaf);
  }, [invokeHub]);

  useEffect(() => {
    if (!meUserId) return;

    const connection = createCommunityHub();
    hubRef.current = connection;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    connection.on("MessageCreated", (message: CommunityMessage) => {
      upsertMessage(queryClient, message);
      setTypingMap((current) => {
        const channel = current[message.channelId];
        if (!channel?.[message.authorId]) return current;
        const rest = { ...channel };
        delete rest[message.authorId];
        return { ...current, [message.channelId]: rest };
      });
      const isMine = message.authorId === meUserId;
      const isWatching = activeTextChannelRef.current === message.channelId && !document.hidden;
      if (!isMine && !isWatching) {
        setUnreadChannelIds((current) => new Set(current).add(message.channelId));
      }
    });
    connection.on("MessageUpdated", (message: CommunityMessage) => {
      patchMessage(queryClient, message.channelId, message.id, {
        content: message.content,
        editedAt: message.editedAt,
        authorName: message.authorName,
      });
    });
    connection.on("MessageDeleted", ({ channelId, messageId }: { channelId: string; messageId: string }) => {
      removeMessage(queryClient, channelId, messageId);
    });
    connection.on("ChannelsChanged", () => {
      void queryClient.invalidateQueries({ queryKey: communityKeys.channels });
    });
    connection.on("MembersChanged", () => {
      void queryClient.invalidateQueries({ queryKey: communityKeys.members });
      void queryClient.invalidateQueries({ queryKey: communityKeys.me });
    });
    connection.on("PresenceChanged", (snapshot: PresenceSnapshot) => setPresence(snapshot));
    connection.on("Typing", ({ channelId, userId }: { channelId: string; userId: string }) => {
      setTypingMap((current) => ({
        ...current,
        [channelId]: { ...current[channelId], [userId]: Date.now() + TYPING_TTL_MS },
      }));
    });

    // Ao voltar de uma queda: o servidor perdeu nossa presença/voz (estado em memória) e podem ter
    // chegado mensagens que não recebemos — reenvia o estado de voz e recarrega o histórico aberto.
    const resync = async () => {
      const snapshot = await connection.invoke<PresenceSnapshot>("GetPresence").catch(() => null);
      if (snapshot) setPresence(snapshot);
      if (voiceStateRef.current.channelId) {
        publishVoiceState();
        const room = roomRef.current;
        if (room?.localParticipant.isScreenShareEnabled) {
          void connection.invoke("RequestScreenShare", voiceStateRef.current.channelId).catch(() => undefined);
        }
      }
    };

    connection.onreconnecting(() => setHubStatus("reconnecting"));
    connection.onreconnected(() => {
      setHubStatus("connected");
      void queryClient.invalidateQueries({ queryKey: ["community", "messages"] });
      void resync();
    });

    const start = async () => {
      if (disposed) return;
      setHubStatus("connecting");
      try {
        await connection.start();
        if (disposed) return;
        setHubStatus("connected");
        await resync();
      } catch {
        if (disposed) return;
        setHubStatus("disconnected");
        retryTimer = setTimeout(start, 10_000);
      }
    };

    // O reconnect automático desistiu (queda longa): continua tentando em segundo plano.
    connection.onclose(() => {
      if (disposed) return;
      setHubStatus("disconnected");
      setPresence(EMPTY_PRESENCE);
      retryTimer = setTimeout(start, 5_000);
    });

    void start();

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      hubRef.current = null;
      void connection.stop();
      setHubStatus("idle");
    };
  }, [meUserId, queryClient, publishVoiceState]);

  // Expira os "digitando..." sem precisar de evento de parada.
  const hasTyping = Object.values(typingMap).some((channel) => Object.keys(channel).length > 0);
  useEffect(() => {
    if (!hasTyping) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingMap((current) => {
        const next: Record<string, Record<string, number>> = {};
        for (const [channelId, users] of Object.entries(current)) {
          const alive = Object.fromEntries(Object.entries(users).filter(([, until]) => until > now));
          if (Object.keys(alive).length > 0) next[channelId] = alive;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasTyping]);

  const typing = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [channelId, users] of Object.entries(typingMap)) {
      result[channelId] = Object.keys(users).filter((id) => id !== meUserId);
    }
    return result;
  }, [typingMap, meUserId]);

  const setActiveTextChannel = useCallback((channelId: string | null) => {
    activeTextChannelRef.current = channelId;
    if (!channelId) return;
    setUnreadChannelIds((current) => {
      if (!current.has(channelId)) return current;
      const next = new Set(current);
      next.delete(channelId);
      return next;
    });
  }, []);

  const sendTyping = useCallback(
    (channelId: string) => {
      const now = Date.now();
      if (now - (lastTypingSentRef.current[channelId] ?? 0) < TYPING_THROTTLE_MS) return;
      lastTypingSentRef.current[channelId] = now;
      void invokeHub("StartTyping", channelId);
    },
    [invokeHub],
  );

  // ── Voz ───────────────────────────────────────────────────────────────────
  const detachAllAudio = useCallback(() => {
    for (const element of audioElementsRef.current.values()) element.remove();
    audioElementsRef.current.clear();
  }, []);

  const leaveVoice = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    // Zera o ref ANTES de desconectar: assim o handler de Disconnected sabe que foi intencional.
    roomRef.current = null;
    setVoice(null);
    setSpeakingIds(new Set());
    detachAllAudio();
    voiceStateRef.current = { ...voiceStateRef.current, channelId: null };
    publishVoiceState();
    await room.disconnect();
  }, [detachAllAudio, publishVoiceState]);

  const joinVoice = useCallback(
    async (channelId: string) => {
      if (roomRef.current && voiceStateRef.current.channelId === channelId) return;
      await leaveVoice();
      setVoiceError(null);

      let credentials;
      try {
        credentials = await CommunityService.getVoiceToken(channelId);
      } catch (error) {
        setVoiceError(
          isAxiosError(error) && error.response?.status === 503
            ? "O servidor de voz ainda não está configurado."
            : "Não foi possível entrar na sala de voz.",
        );
        return;
      }

      let livekit: typeof import("livekit-client");
      try {
        livekit = await import("livekit-client");
      } catch {
        setVoiceError("Não foi possível carregar a voz. Recarregue a página.");
        return;
      }
      const { Room, RoomEvent, Track, DisconnectReason: Reason } = livekit;

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        publishDefaults: { dtx: true, red: true },
      });

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
          if (track.kind === Track.Kind.Audio) {
            const element = track.attach();
            element.muted = voiceStateRef.current.deafened;
            element.style.display = "none";
            document.body.appendChild(element);
            audioElementsRef.current.set(publication.trackSid, element);
          }
          bumpVoice();
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
          if (track.kind === Track.Kind.Audio) {
            track.detach().forEach((element) => element.remove());
            audioElementsRef.current.delete(publication.trackSid);
          }
          bumpVoice();
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          setSpeakingIds(new Set(speakers.map((speaker) => speaker.identity)));
        })
        .on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication) => {
          // Cobre também o "Parar compartilhamento" nativo do navegador.
          if (publication.source === Track.Source.ScreenShare) void invokeHub("StopScreenShare");
          bumpVoice();
        })
        .on(RoomEvent.ParticipantConnected, bumpVoice)
        .on(RoomEvent.ParticipantDisconnected, bumpVoice)
        .on(RoomEvent.TrackPublished, bumpVoice)
        .on(RoomEvent.TrackUnpublished, bumpVoice)
        .on(RoomEvent.TrackMuted, bumpVoice)
        .on(RoomEvent.TrackUnmuted, bumpVoice)
        .on(RoomEvent.LocalTrackPublished, bumpVoice)
        .on(RoomEvent.ConnectionQualityChanged, bumpVoice)
        .on(RoomEvent.AudioPlaybackStatusChanged, () => setCanPlaybackAudio(room.canPlaybackAudio))
        .on(RoomEvent.Reconnecting, () => {
          setVoice((current) => (current?.room === room ? { ...current, status: "reconnecting" } : current));
        })
        .on(RoomEvent.Reconnected, () => {
          setVoice((current) => (current?.room === room ? { ...current, status: "connected" } : current));
        })
        .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          if (roomRef.current !== room) return;
          roomRef.current = null;
          setVoice(null);
          setSpeakingIds(new Set());
          detachAllAudio();
          voiceStateRef.current = { ...voiceStateRef.current, channelId: null };
          publishVoiceState();
          if (reason !== Reason.CLIENT_INITIATED) {
            setVoiceError("A conexão com a sala de voz caiu. Entre novamente.");
          }
        });

      roomRef.current = room;
      setVoice({ channelId, room, status: "connecting" });
      setDeafened(false);

      try {
        await room.connect(credentials.url, credentials.token);
      } catch {
        if (roomRef.current === room) {
          roomRef.current = null;
          setVoice(null);
        }
        setVoiceError("Não foi possível conectar ao servidor de voz.");
        return;
      }
      if (roomRef.current !== room) return; // saiu enquanto conectava

      setVoice({ channelId, room, status: "connected" });
      setCanPlaybackAudio(room.canPlaybackAudio);

      let muted = false;
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        muted = true;
        setVoiceError("Não conseguimos acessar seu microfone. Libere a permissão no navegador para falar.");
      }
      setMicMuted(muted);
      voiceStateRef.current = { channelId, micMuted: muted, deafened: false };
      publishVoiceState();
      bumpVoice();
    },
    [leaveVoice, invokeHub, detachAllAudio, publishVoiceState],
  );

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextMuted = !voiceStateRef.current.micMuted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextMuted);
    } catch {
      setVoiceError("Não conseguimos acessar seu microfone. Libere a permissão no navegador para falar.");
      return;
    }
    // Desmutar com o fone desligado religa o fone também (mesmo comportamento do Discord).
    if (!nextMuted && voiceStateRef.current.deafened) {
      for (const element of audioElementsRef.current.values()) element.muted = false;
      setDeafened(false);
      voiceStateRef.current.deafened = false;
    }
    setMicMuted(nextMuted);
    voiceStateRef.current.micMuted = nextMuted;
    publishVoiceState();
    bumpVoice();
  }, [publishVoiceState]);

  const toggleDeafen = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const nextDeafened = !voiceStateRef.current.deafened;
    for (const element of audioElementsRef.current.values()) element.muted = nextDeafened;

    // Ensurdecer também muta o microfone; ao voltar, o mic volta como estava antes.
    let nextMuted: boolean;
    if (nextDeafened) {
      mutedBeforeDeafenRef.current = voiceStateRef.current.micMuted;
      nextMuted = true;
    } else {
      nextMuted = mutedBeforeDeafenRef.current;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(!nextMuted);
    } catch {
      nextMuted = true;
    }
    setDeafened(nextDeafened);
    setMicMuted(nextMuted);
    voiceStateRef.current = { ...voiceStateRef.current, deafened: nextDeafened, micMuted: nextMuted };
    publishVoiceState();
    bumpVoice();
  }, [publishVoiceState]);

  const startScreenShare = useCallback(async () => {
    const room = roomRef.current;
    const channelId = voiceStateRef.current.channelId;
    if (!room || !channelId) return;

    const granted = await invokeHub<boolean>("RequestScreenShare", channelId);
    if (!granted) {
      setVoiceError(
        granted === false
          ? "Alguém já está transmitindo nesta sala — uma transmissão por vez."
          : "Sem conexão com a Taverna agora. Tente de novo em instantes.",
      );
      return;
    }

    try {
      const { ScreenSharePresets } = await import("livekit-client");
      // O SFU só repassa pacotes (a VPS mal sente a transmissão); o gargalo é o encoder e o upload
      // de quem transmite. H.264 costuma usar o encoder de hardware da GPU → menos CPU e menos lag.
      // "smooth" pede ao navegador que derrube resolução antes de FPS; "sharp", o contrário.
      const smooth = screenShareMode === "smooth";
      const preset = smooth ? ScreenSharePresets.h1080fps30 : ScreenSharePresets.h1080fps15;
      await room.localParticipant.setScreenShareEnabled(
        true,
        {
          audio: true,
          systemAudio: "include",
          selfBrowserSurface: "exclude",
          contentHint: smooth ? "motion" : "detail",
          resolution: preset.resolution,
        },
        {
          videoCodec: "h264",
          screenShareEncoding: smooth
            ? { maxBitrate: 4_500_000, maxFramerate: 30 }
            : { maxBitrate: 3_000_000, maxFramerate: 15 },
          degradationPreference: smooth ? "maintain-framerate" : "maintain-resolution",
        },
      );
    } catch (error) {
      void invokeHub("StopScreenShare");
      const name = error instanceof Error ? error.name : "";
      // Cancelar o seletor de tela não é erro.
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setVoiceError("Não foi possível compartilhar a tela neste navegador.");
      }
    }
    bumpVoice();
  }, [invokeHub, screenShareMode]);

  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setScreenShareEnabled(false);
    void invokeHub("StopScreenShare");
    bumpVoice();
  }, [invokeHub]);

  const startAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.startAudio();
    setCanPlaybackAudio(room.canPlaybackAudio);
  }, []);

  // Logout / perda de acesso: derruba a voz.
  useEffect(() => {
    if (!meUserId) void leaveVoice();
  }, [meUserId, leaveVoice]);

  // Fechar a aba: sai da sala na hora (sem esperar o timeout do servidor).
  useEffect(() => {
    const handleUnload = () => {
      void roomRef.current?.disconnect();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const value = useMemo<TavernaContextValue>(
    () => ({
      me,
      isAdmin: Boolean(me && me.role === "Admin"),
      hubStatus,
      presence,
      typing,
      unreadChannelIds,
      setActiveTextChannel,
      sendTyping,
      voice,
      voiceVersion,
      speakingIds,
      micMuted,
      deafened,
      voiceError,
      canPlaybackAudio,
      joinVoice,
      leaveVoice,
      toggleMute,
      toggleDeafen,
      screenShareMode,
      setScreenShareMode,
      startScreenShare,
      stopScreenShare,
      startAudio,
      clearVoiceError: () => setVoiceError(null),
    }),
    [
      me,
      hubStatus,
      presence,
      typing,
      unreadChannelIds,
      setActiveTextChannel,
      sendTyping,
      voice,
      voiceVersion,
      speakingIds,
      micMuted,
      deafened,
      voiceError,
      canPlaybackAudio,
      joinVoice,
      leaveVoice,
      toggleMute,
      toggleDeafen,
      screenShareMode,
      setScreenShareMode,
      startScreenShare,
      stopScreenShare,
      startAudio,
    ],
  );

  return <TavernaContext.Provider value={value}>{children}</TavernaContext.Provider>;
}
