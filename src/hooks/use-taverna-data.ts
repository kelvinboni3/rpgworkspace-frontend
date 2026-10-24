import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTaverna } from "@/hooks/use-taverna";
import { CommunityService, communityKeys } from "@/services/community-service";

export function useTavernaChannels() {
  const { me } = useTaverna();
  return useQuery({
    queryKey: communityKeys.channels,
    queryFn: CommunityService.getChannels,
    enabled: Boolean(me),
  });
}

/** Membros + mapa userId → nome exibido (apelido ou nome da conta). */
export function useTavernaMembers() {
  const { me } = useTaverna();
  const query = useQuery({
    queryKey: communityKeys.members,
    queryFn: CommunityService.getMembers,
    enabled: Boolean(me),
  });

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of query.data ?? []) map.set(member.userId, member.displayName);
    return map;
  }, [query.data]);

  return { ...query, nameById };
}
