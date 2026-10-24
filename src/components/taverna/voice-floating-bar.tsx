import { HeadphoneOff, Headphones, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { Link, useLocation } from "react-router";
import { IconToggle } from "@/components/taverna/voice-controls";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaChannels } from "@/hooks/use-taverna-data";
import { paths } from "@/routes/paths";

/** Mini-controle de voz no resto do app: a chamada continua enquanto a pessoa navega fora da Taverna. */
export function VoiceFloatingBar() {
  const { voice, micMuted, deafened, toggleMute, toggleDeafen, leaveVoice } = useTaverna();
  const { data: channels } = useTavernaChannels();
  const location = useLocation();

  if (!voice || location.pathname.startsWith(paths.taverna)) return null;
  const channel = channels?.find((c) => c.id === voice.channelId);

  return (
    <div className="bg-popover/95 border-border/60 fixed right-4 bottom-4 z-40 flex items-center gap-1 rounded-xl border py-1.5 pr-1.5 pl-3 shadow-xl backdrop-blur">
      <Link
        to={paths.tavernaChannel(voice.channelId)}
        className="mr-2 flex min-w-0 items-center gap-2 text-sm hover:underline"
        title="Voltar para a sala"
      >
        <Volume2 className="size-4 shrink-0 text-emerald-500" />
        <span className="max-w-40 truncate font-medium">{channel?.name ?? "Sala de voz"}</span>
      </Link>
      <IconToggle active={false} danger={micMuted} label={micMuted ? "Ativar microfone" : "Silenciar"} onClick={() => void toggleMute()}>
        {micMuted ? <MicOff /> : <Mic />}
      </IconToggle>
      <IconToggle active={false} danger={deafened} label={deafened ? "Ativar áudio" : "Desativar áudio"} onClick={() => void toggleDeafen()}>
        {deafened ? <HeadphoneOff /> : <Headphones />}
      </IconToggle>
      <IconToggle active={false} danger label="Sair da voz" onClick={() => void leaveVoice()}>
        <PhoneOff />
      </IconToggle>
    </div>
  );
}
