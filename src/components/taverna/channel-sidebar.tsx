import { useMemo, useState } from "react";
import { ChevronDown, Hash, Megaphone, MicOff, HeadphoneOff, MonitorUp, Plus, Settings, Volume2 } from "lucide-react";
import { NavLink } from "react-router";
import { ChannelDialog } from "@/components/taverna/channel-dialog";
import { ProfileDialog } from "@/components/taverna/profile-dialog";
import { TavernaAvatar } from "@/components/taverna/taverna-avatar";
import { UserPanel, VoiceConnectionPanel } from "@/components/taverna/voice-controls";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaMembers } from "@/hooks/use-taverna-data";
import type { CommunityChannel, CommunityChannelType } from "@/services/community-service";
import { paths } from "@/routes/paths";
import { cn } from "@/utils/cn";

type DialogState =
  | { kind: "create"; category: string; type: CommunityChannelType }
  | { kind: "edit"; channel: CommunityChannel }
  | { kind: "profile" }
  | null;

type ChannelSidebarProps = {
  channels: CommunityChannel[];
  activeChannelId: string | undefined;
};

export function ChannelSidebar({ channels, activeChannelId }: ChannelSidebarProps) {
  const { me, isAdmin, unreadChannelIds, presence, speakingIds, voice, joinVoice } = useTaverna();
  const { nameById } = useTavernaMembers();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Categorias na ordem em que aparecem (canais já vêm ordenados por posição).
  const groups = useMemo(() => {
    const result: { category: string; channels: CommunityChannel[] }[] = [];
    for (const channel of channels) {
      const group = result.find((g) => g.category === channel.category);
      if (group) group.channels.push(channel);
      else result.push({ category: channel.category, channels: [channel] });
    }
    return result;
  }, [channels]);
  const categories = groups.map((g) => g.category);

  const toggleCategory = (category: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  return (
    <aside className="bg-card/40 border-border/60 flex h-full w-full flex-col border-r">
      <div className="border-border/60 flex h-12 shrink-0 items-center justify-between border-b px-4">
        <h2 className="font-display truncate font-semibold">Taverna</h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setDialog({ kind: "create", category: categories[0] ?? "Texto", type: "Text" })}
            className="text-muted-foreground hover:text-foreground rounded p-1"
            aria-label="Novo canal"
            title="Novo canal"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {groups.map((group) => {
          const isCollapsed = collapsed.has(group.category);
          const groupType = group.channels[0]?.type ?? "Text";
          return (
            <div key={group.category}>
              <div className="group/cat flex items-center justify-between pr-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(group.category)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-1 py-1 text-[11px] font-semibold tracking-wider uppercase"
                >
                  <ChevronDown className={cn("size-3 transition-transform", isCollapsed && "-rotate-90")} />
                  {group.category}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: "create", category: group.category, type: groupType })}
                    className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover/cat:opacity-100 focus:opacity-100"
                    aria-label={`Novo canal em ${group.category}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>

              <ul className="mt-0.5 space-y-0.5">
                {group.channels.map((channel) => {
                  const isActive = channel.id === activeChannelId;
                  const isUnread = unreadChannelIds.has(channel.id);
                  const voiceUsers = presence.voice.filter((v) => v.channelId === channel.id);
                  const isMyVoice = voice?.channelId === channel.id;
                  if (isCollapsed && !isActive && voiceUsers.length === 0) return null;

                  const Icon = channel.type === "Voice" ? Volume2 : channel.isReadOnly ? Megaphone : Hash;
                  return (
                    <li key={channel.id}>
                      <div className="group/ch relative flex items-center">
                        <NavLink
                          to={paths.tavernaChannel(channel.id)}
                          onClick={() => {
                            // Clicar numa sala de voz já entra nela, como no Discord.
                            if (channel.type === "Voice" && !isMyVoice) void joinVoice(channel.id);
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/15 text-foreground font-medium"
                              : isUnread
                                ? "text-foreground hover:bg-accent/10 font-semibold"
                                : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                          )}
                        >
                          <Icon className={cn("size-4 shrink-0", isMyVoice && "text-emerald-500")} />
                          <span className="truncate">{channel.name}</span>
                          {isUnread && !isActive && <span className="bg-foreground ml-auto size-2 shrink-0 rounded-full" />}
                        </NavLink>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDialog({ kind: "edit", channel })}
                            className="text-muted-foreground hover:text-foreground absolute right-1.5 rounded p-0.5 opacity-0 transition-opacity group-hover/ch:opacity-100 focus:opacity-100"
                            aria-label={`Editar ${channel.name}`}
                          >
                            <Settings className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {channel.type === "Voice" && voiceUsers.length > 0 && (
                        <ul className="mt-0.5 mb-1 ml-6 space-y-0.5">
                          {voiceUsers.map((state) => {
                            const name =
                              me && state.userId === me.userId ? me.displayName : (nameById.get(state.userId) ?? "...");
                            return (
                              <li key={state.userId} className="text-muted-foreground flex items-center gap-2 px-1 py-0.5 text-xs">
                                <TavernaAvatar
                                  userId={state.userId}
                                  name={name}
                                  size="sm"
                                  speaking={isMyVoice && speakingIds.has(state.userId)}
                                />
                                <span className="truncate">{name}</span>
                                <span className="ml-auto flex items-center gap-1">
                                  {state.streaming && (
                                    <span className="flex items-center gap-0.5 rounded bg-red-500 px-1 text-[9px] font-bold text-white">
                                      <MonitorUp className="size-2.5" />
                                      AO VIVO
                                    </span>
                                  )}
                                  {state.deafened ? (
                                    <HeadphoneOff className="text-destructive size-3" />
                                  ) : (
                                    state.muted && <MicOff className="text-destructive size-3" />
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <VoiceConnectionPanel />
      <UserPanel onOpenProfile={() => setDialog({ kind: "profile" })} />

      {dialog?.kind === "create" && (
        <ChannelDialog
          categories={categories}
          defaultCategory={dialog.category}
          defaultType={dialog.type}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "edit" && (
        <ChannelDialog channel={dialog.channel} categories={categories} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "profile" && me && <ProfileDialog me={me} onClose={() => setDialog(null)} />}
    </aside>
  );
}
