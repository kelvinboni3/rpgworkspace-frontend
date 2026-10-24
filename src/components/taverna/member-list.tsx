import { Crown, MonitorUp, Volume2 } from "lucide-react";
import { TavernaAvatar } from "@/components/taverna/taverna-avatar";
import { useTaverna } from "@/hooks/use-taverna";
import { useTavernaMembers } from "@/hooks/use-taverna-data";
import type { CommunityMember } from "@/services/community-service";

export function MemberList() {
  const { presence } = useTaverna();
  const { data: members } = useTavernaMembers();

  const online = new Set(presence.onlineUserIds);
  const voiceByUser = new Map(presence.voice.map((v) => [v.userId, v]));
  const onlineMembers = (members ?? []).filter((m) => online.has(m.userId));
  const offlineMembers = (members ?? []).filter((m) => !online.has(m.userId));

  const renderMember = (member: CommunityMember, isOnline: boolean) => {
    const voiceState = voiceByUser.get(member.userId);
    return (
      <li
        key={member.userId}
        className={`hover:bg-accent/10 flex items-center gap-2.5 rounded-md px-2 py-1.5 ${isOnline ? "" : "opacity-45"}`}
      >
        <TavernaAvatar userId={member.userId} name={member.displayName} online={isOnline} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-sm font-medium">
            <span className="truncate">{member.displayName}</span>
            {member.role === "Admin" && (
              <span title="Administrador">
                <Crown className="size-3.5 shrink-0 text-amber-500" />
              </span>
            )}
          </p>
          {voiceState && (
            <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
              {voiceState.streaming ? (
                <>
                  <MonitorUp className="size-3 text-red-500" /> Transmitindo
                </>
              ) : (
                <>
                  <Volume2 className="size-3 text-emerald-500" /> Em voz
                </>
              )}
            </p>
          )}
        </div>
      </li>
    );
  };

  return (
    <aside className="bg-card/40 border-border/60 h-full w-full overflow-y-auto border-l px-2 py-3">
      <h3 className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
        Online — {onlineMembers.length}
      </h3>
      <ul className="mb-4 space-y-0.5">{onlineMembers.map((m) => renderMember(m, true))}</ul>
      {offlineMembers.length > 0 && (
        <>
          <h3 className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-wider uppercase">
            Offline — {offlineMembers.length}
          </h3>
          <ul className="space-y-0.5">{offlineMembers.map((m) => renderMember(m, false))}</ul>
        </>
      )}
    </aside>
  );
}
