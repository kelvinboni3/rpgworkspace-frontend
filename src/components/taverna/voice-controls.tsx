import type { ReactNode } from "react";
import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Settings, Signal } from "lucide-react";
import { TavernaAvatar } from "@/components/taverna/taverna-avatar";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaChannels } from "@/hooks/use-taverna-data";
import { cn } from "@/utils/cn";

type IconToggleProps = {
  active: boolean;
  danger?: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
};

export function IconToggle({ active, danger, label, onClick, disabled, children }: IconToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 [&_svg]:size-4",
        danger
          ? "text-destructive hover:bg-destructive/15"
          : active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-accent/15 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Caixa "Voz conectada" que aparece acima do painel do usuário enquanto está numa sala. */
export function VoiceConnectionPanel() {
  const { voice, leaveVoice, startScreenShare, stopScreenShare, voiceVersion } = useTaverna();
  const { data: channels } = useTavernaChannels();
  if (!voice) return null;

  void voiceVersion; // re-render a cada evento da sala
  const channel = channels?.find((c) => c.id === voice.channelId);
  const isSharing = voice.room.localParticipant.isScreenShareEnabled;
  const statusLabel =
    voice.status === "connected" ? "Voz conectada" : voice.status === "connecting" ? "Conectando..." : "Reconectando...";

  return (
    <div className="border-border/60 flex items-center gap-2 border-t px-3 py-2">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs font-semibold",
            voice.status === "connected" ? "text-emerald-500" : "text-amber-500",
          )}
        >
          <Signal className="size-3.5" />
          {statusLabel}
        </p>
        <p className="text-muted-foreground truncate text-xs">{channel?.name ?? "Sala de voz"}</p>
      </div>
      <IconToggle
        active={isSharing}
        label={isSharing ? "Parar transmissão" : "Compartilhar tela"}
        onClick={() => void (isSharing ? stopScreenShare() : startScreenShare())}
        disabled={voice.status !== "connected"}
      >
        {isSharing ? <MonitorX /> : <MonitorUp />}
      </IconToggle>
      <IconToggle active={false} danger label="Sair da voz" onClick={() => void leaveVoice()}>
        <PhoneOff />
      </IconToggle>
    </div>
  );
}

/** Painel fixo no rodapé da barra de canais: quem sou eu + mic/fone/perfil. */
export function UserPanel({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { me, voice, micMuted, deafened, toggleMute, toggleDeafen, speakingIds, hubStatus } = useTaverna();
  if (!me) return null;

  const inVoice = Boolean(voice);
  const statusText =
    hubStatus === "connected" ? "Online" : hubStatus === "reconnecting" || hubStatus === "connecting" ? "Conectando..." : "Offline";

  return (
    <div className="bg-background/40 flex items-center gap-2 px-3 py-2">
      <TavernaAvatar
        userId={me.userId}
        name={me.displayName}
        online={hubStatus === "connected"}
        speaking={speakingIds.has(me.userId)}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{me.displayName}</p>
        <p className="text-muted-foreground truncate text-xs">{statusText}</p>
      </div>
      <IconToggle
        active={false}
        danger={inVoice && micMuted}
        label={micMuted ? "Ativar microfone" : "Silenciar microfone"}
        onClick={() => void toggleMute()}
        disabled={!inVoice}
      >
        {inVoice && micMuted ? <MicOff /> : <Mic />}
      </IconToggle>
      <IconToggle
        active={false}
        danger={inVoice && deafened}
        label={deafened ? "Ativar áudio" : "Desativar áudio"}
        onClick={() => void toggleDeafen()}
        disabled={!inVoice}
      >
        {inVoice && deafened ? <HeadphoneOff /> : <Headphones />}
      </IconToggle>
      <IconToggle active={false} label="Perfil" onClick={onOpenProfile}>
        <Settings />
      </IconToggle>
    </div>
  );
}
