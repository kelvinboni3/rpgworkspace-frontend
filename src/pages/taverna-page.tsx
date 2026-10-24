import { useEffect, useState } from "react";
import { Loader2, Menu, Users, WifiOff, X } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router";
import { ChannelSidebar } from "@/components/taverna/channel-sidebar";
import { MemberList } from "@/components/taverna/member-list";
import { TextChannelView } from "@/components/taverna/text-channel-view";
import { VoiceChannelView } from "@/components/taverna/voice-channel-view";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaChannels } from "@/hooks/use-taverna-data";
import { paths } from "@/routes/paths";
import { cn } from "@/utils/cn";

export function TavernaPage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { me, hubStatus, voiceError, clearVoiceError, canPlaybackAudio, startAudio, voice } = useTaverna();
  const channelsQuery = useTavernaChannels();
  // A gaveta mobile guarda em qual canal foi aberta: trocar de canal a fecha sem precisar de efeito.
  const [drawer, setDrawer] = useState<{ panel: "channels" | "members"; channelId?: string } | null>(null);
  const mobilePanel = drawer && drawer.channelId === channelId ? drawer.panel : null;
  const toggleDrawer = (panel: "channels" | "members") =>
    setDrawer(mobilePanel === panel ? null : { panel, channelId });

  const channels = channelsQuery.data ?? [];
  const activeChannel = channels.find((c) => c.id === channelId);
  const firstTextChannel = channels.find((c) => c.type === "Text") ?? channels[0];

  // Canal inexistente (apagado, link velho) ou nenhum selecionado → primeiro canal de texto.
  useEffect(() => {
    if (channelsQuery.isSuccess && !activeChannel && firstTextChannel) {
      navigate(paths.tavernaChannel(firstTextChannel.id), { replace: true });
    }
  }, [channelsQuery.isSuccess, activeChannel, firstTextChannel, navigate]);

  // Erros de voz somem sozinhos depois de um tempo.
  useEffect(() => {
    if (!voiceError) return;
    const timer = setTimeout(clearVoiceError, 8000);
    return () => clearTimeout(timer);
  }, [voiceError, clearVoiceError]);

  if (me === false) return <Navigate to={paths.characters} replace />;

  if (me === null || channelsQuery.isPending) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border-border/60 bg-background/40 relative -mx-6 -my-8 grid h-[calc(100dvh-4rem)] overflow-hidden border-x md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_220px]">
      {/* Barra de canais: coluna fixa no desktop, gaveta no celular */}
      <div
        className={cn(
          "bg-background absolute inset-y-0 left-0 z-20 w-64 md:static md:z-auto md:w-auto",
          mobilePanel === "channels" ? "block" : "hidden md:block",
        )}
      >
        <ChannelSidebar channels={channels} activeChannelId={activeChannel?.id} />
      </div>

      <section className="relative flex min-h-0 min-w-0 flex-col">
        <div className="border-border/60 flex items-center gap-2 border-b px-2 py-1 md:hidden">
          <button
            type="button"
            onClick={() => toggleDrawer("channels")}
            className="text-muted-foreground hover:text-foreground rounded p-1.5"
            aria-label="Canais"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex-1 truncate text-sm font-medium">{activeChannel?.name}</span>
          <button
            type="button"
            onClick={() => toggleDrawer("members")}
            className="text-muted-foreground hover:text-foreground rounded p-1.5 lg:hidden"
            aria-label="Membros"
          >
            <Users className="size-5" />
          </button>
        </div>

        {(hubStatus === "reconnecting" || hubStatus === "disconnected") && (
          <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400">
            <WifiOff className="size-3.5" />
            {hubStatus === "reconnecting"
              ? "Conexão instável — reconectando à Taverna..."
              : "Sem conexão com a Taverna. Tentando de novo..."}
          </div>
        )}
        {voice && !canPlaybackAudio && (
          <button
            type="button"
            onClick={() => void startAudio()}
            className="bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium"
          >
            O navegador bloqueou o áudio — clique aqui para ouvir a sala
          </button>
        )}

        <div className="min-h-0 flex-1">
          {activeChannel ? (
            activeChannel.type === "Voice" ? (
              <VoiceChannelView key={activeChannel.id} channel={activeChannel} />
            ) : (
              <TextChannelView key={activeChannel.id} channel={activeChannel} />
            )
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Nenhum canal ainda.
            </div>
          )}
        </div>

        {voiceError && (
          <div className="bg-popover border-destructive/40 absolute bottom-24 left-1/2 z-30 flex max-w-[90%] -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-xl">
            <span>{voiceError}</span>
            <button type="button" onClick={clearVoiceError} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}
      </section>

      <div
        className={cn(
          "bg-background absolute inset-y-0 right-0 z-20 w-60 lg:static lg:z-auto lg:w-auto",
          mobilePanel === "members" ? "block" : "hidden lg:block",
        )}
      >
        <MemberList />
      </div>
    </div>
  );
}
