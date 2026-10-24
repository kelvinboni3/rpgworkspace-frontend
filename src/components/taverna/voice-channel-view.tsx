import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ConnectionQuality,
  Track,
  type Participant,
  type VideoTrack,
} from "livekit-client";
import {
  Eye,
  Gauge,
  Headphones,
  HeadphoneOff,
  Loader2,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Volume2,
  WifiLow,
} from "lucide-react";
import { TavernaAvatar } from "@/components/taverna/taverna-avatar";
import { Button } from "@/components/ui/button";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaMembers } from "@/hooks/use-taverna-data";
import type { CommunityChannel } from "@/services/community-service";
import { cn } from "@/utils/cn";

function VideoTrackView({ track, className }: { track: VideoTrack; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    track.attach(element);
    return () => {
      track.detach(element);
    };
  }, [track]);

  return <video ref={ref} autoPlay playsInline muted className={className} />;
}

function screenShareOf(participant: Participant) {
  const publication = participant.getTrackPublication(Track.Source.ScreenShare);
  const track = publication?.track;
  return track && !publication.isMuted ? (track as VideoTrack) : null;
}

export function VoiceChannelView({ channel }: { channel: CommunityChannel }) {
  const {
    me,
    voice,
    voiceVersion,
    speakingIds,
    micMuted,
    deafened,
    presence,
    joinVoice,
    leaveVoice,
    toggleMute,
    toggleDeafen,
    screenShareMode,
    setScreenShareMode,
    startScreenShare,
    stopScreenShare,
  } = useTaverna();
  const { nameById } = useTavernaMembers();
  const stageRef = useRef<HTMLDivElement>(null);
  const [joining, setJoining] = useState(false);
  // Prévia da própria tela começa desligada: renderizar a captura dentro da página que está sendo
  // capturada gera o "espelho infinito" e deixa o encoder de quem transmite mais pesado.
  const [showOwnPreview, setShowOwnPreview] = useState(false);

  const isHere = voice?.channelId === channel.id;
  void voiceVersion; // a Room é mutável; voiceVersion força o re-render a cada evento

  const room = isHere ? voice.room : null;
  const participants: Participant[] = room
    ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())]
    : [];
  const sharer = participants.find((p) => screenShareOf(p));
  const sharedTrack = sharer ? screenShareOf(sharer) : null;
  const isSharing = room?.localParticipant.isScreenShareEnabled ?? false;
  const someoneElseSharing = Boolean(sharer && sharer !== room?.localParticipant);
  const isLocalSharer = Boolean(sharer && sharer === room?.localParticipant);

  // Fora da sala: mostra quem está lá pela presença do hub.
  const outsideUsers = presence.voice.filter((v) => v.channelId === channel.id);

  const handleJoin = async () => {
    setJoining(true);
    await joinVoice(channel.id);
    setJoining(false);
  };

  const goFullscreen = () => {
    void stageRef.current?.requestFullscreen?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border/60 flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Volume2 className="text-muted-foreground size-5" />
        <h1 className="font-semibold">{channel.name}</h1>
        {isHere && voice.status !== "connected" && (
          <span className="flex items-center gap-1 text-xs text-amber-500">
            <Loader2 className="size-3 animate-spin" />
            {voice.status === "connecting" ? "Conectando..." : "Reconectando..."}
          </span>
        )}
      </header>

      {!isHere ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex -space-x-2">
            {outsideUsers.slice(0, 6).map((state) => (
              <TavernaAvatar
                key={state.userId}
                userId={state.userId}
                name={nameById.get(state.userId) ?? "?"}
                size="lg"
                className="ring-background rounded-full ring-4"
              />
            ))}
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">{channel.name}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {outsideUsers.length === 0
                ? "Ninguém por aqui ainda. Puxe uma cadeira!"
                : `${outsideUsers.length} ${outsideUsers.length === 1 ? "pessoa" : "pessoas"} na sala`}
            </p>
          </div>
          <Button size="lg" onClick={() => void handleJoin()} disabled={joining}>
            {joining ? <Loader2 className="animate-spin" /> : <Volume2 />}
            Entrar na sala
          </Button>
          {voice && (
            <p className="text-muted-foreground text-xs">Você vai sair da sala de voz atual.</p>
          )}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {sharedTrack && sharer ? (
              <div className="flex h-full flex-col gap-3">
                <div ref={stageRef} className="group relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
                  {isLocalSharer && !showOwnPreview ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white">
                      <MonitorUp className="size-10 text-red-500" />
                      <p className="font-display text-lg font-semibold">Você está transmitindo sua tela</p>
                      <p className="max-w-sm text-sm text-white/60">
                        A prévia fica desligada para não pesar na sua transmissão.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowOwnPreview(true)}
                        className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
                      >
                        <Eye className="size-3.5" /> Mostrar prévia
                      </button>
                    </div>
                  ) : (
                    <VideoTrackView track={sharedTrack} className="h-full w-full object-contain" />
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                    <span className="flex items-center gap-1 rounded bg-red-500 px-1 text-[10px] font-bold">AO VIVO</span>
                    {sharer === room?.localParticipant ? "Você está transmitindo" : `Tela de ${sharer.name || nameById.get(sharer.identity) || "alguém"}`}
                  </div>
                  <button
                    type="button"
                    onClick={goFullscreen}
                    className="absolute top-3 right-3 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Tela cheia"
                    title="Tela cheia"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </div>
                <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
                  {participants.map((participant) => (
                    <ParticipantTile
                      key={participant.identity}
                      participant={participant}
                      name={participant.name || nameById.get(participant.identity) || "?"}
                      speaking={speakingIds.has(participant.identity)}
                      isLocal={participant === room?.localParticipant}
                      localMuted={micMuted}
                      localDeafened={deafened}
                      compact
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {participants.map((participant) => (
                  <ParticipantTile
                    key={participant.identity}
                    participant={participant}
                    name={participant.name || nameById.get(participant.identity) || "?"}
                    speaking={speakingIds.has(participant.identity)}
                    isLocal={participant === room?.localParticipant}
                    localMuted={micMuted}
                    localDeafened={deafened}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-border/60 flex shrink-0 items-center justify-center gap-3 border-t px-4 py-3">
            <ControlButton
              label={micMuted ? "Ativar microfone" : "Silenciar"}
              danger={micMuted}
              onClick={() => void toggleMute()}
            >
              {micMuted ? <MicOff /> : <Mic />}
            </ControlButton>
            <ControlButton
              label={deafened ? "Ativar áudio" : "Desativar áudio"}
              danger={deafened}
              onClick={() => void toggleDeafen()}
            >
              {deafened ? <HeadphoneOff /> : <Headphones />}
            </ControlButton>
            <ControlButton
              label={isSharing ? "Parar transmissão" : someoneElseSharing ? "Alguém já está transmitindo" : "Compartilhar tela"}
              active={isSharing}
              disabled={voice.status !== "connected" || someoneElseSharing}
              onClick={() => void (isSharing ? stopScreenShare() : startScreenShare())}
            >
              {isSharing ? <MonitorX /> : <MonitorUp />}
            </ControlButton>
            <ControlButton label="Sair da sala" danger solid onClick={() => void leaveVoice()}>
              <PhoneOff />
            </ControlButton>
          </div>
          <div className="text-muted-foreground flex shrink-0 items-center justify-center gap-2 pb-3 text-xs">
            <Gauge className="size-3.5" />
            <span>Transmissão:</span>
            <div className="bg-secondary flex rounded-md p-0.5" role="radiogroup" aria-label="Qualidade da transmissão">
              {(
                [
                  { mode: "smooth", label: "Fluida", hint: "1080p 30fps — jogos e vídeos" },
                  { mode: "sharp", label: "Nítida", hint: "1080p 15fps — texto, mapas e fichas" },
                ] as const
              ).map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  role="radio"
                  aria-checked={screenShareMode === option.mode}
                  title={isSharing ? "Pare e recomece a transmissão para trocar" : option.hint}
                  disabled={isSharing}
                  onClick={() => setScreenShareMode(option.mode)}
                  className={cn(
                    "rounded px-2.5 py-1 transition-colors disabled:cursor-not-allowed",
                    screenShareMode === option.mode
                      ? "bg-background text-foreground shadow-sm"
                      : "hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {me && !window.isSecureContext && (
            <p className="text-destructive pb-2 text-center text-xs">
              Microfone e tela só funcionam em HTTPS (ou localhost).
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ControlButton({
  label,
  active,
  danger,
  solid,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  solid?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-12 items-center justify-center rounded-full transition-colors disabled:opacity-40 [&_svg]:size-5",
        solid
          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          : danger
            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
            : active
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      )}
    >
      {children}
    </button>
  );
}

function ParticipantTile({
  participant,
  name,
  speaking,
  isLocal,
  localMuted,
  localDeafened,
  compact,
}: {
  participant: Participant;
  name: string;
  speaking: boolean;
  isLocal: boolean;
  localMuted: boolean;
  localDeafened: boolean;
  compact?: boolean;
}) {
  const muted = isLocal ? localMuted : !participant.isMicrophoneEnabled;
  const poorConnection =
    participant.connectionQuality === ConnectionQuality.Poor || participant.connectionQuality === ConnectionQuality.Lost;

  return (
    <div
      className={cn(
        "bg-card/60 relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-colors",
        compact ? "w-36 shrink-0 py-3" : "aspect-video",
        speaking ? "border-emerald-400" : "border-transparent",
      )}
    >
      <TavernaAvatar userId={participant.identity} name={name} size={compact ? "lg" : "xl"} speaking={speaking} />
      <div className="flex max-w-full items-center gap-1 px-2 text-sm font-medium">
        <span className="truncate">
          {name}
          {isLocal && " (você)"}
        </span>
        {isLocal && localDeafened ? (
          <HeadphoneOff className="text-destructive size-3.5 shrink-0" />
        ) : (
          muted && <MicOff className="text-destructive size-3.5 shrink-0" />
        )}
        {participant.isScreenShareEnabled && <MonitorUp className="size-3.5 shrink-0 text-red-500" />}
      </div>
      {poorConnection && (
        <span className="absolute top-2 right-2 text-amber-500" title="Conexão instável">
          <WifiLow className="size-4" />
        </span>
      )}
    </div>
  );
}
