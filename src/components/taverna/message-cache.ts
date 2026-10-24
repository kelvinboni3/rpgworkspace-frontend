import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { communityKeys, type CommunityMessage } from "@/services/community-service";

// Cache do histórico = useInfiniteQuery: pages[0] é a página mais recente (ordem cronológica dentro
// de cada página), pages[n] vão ficando mais antigas. Eventos em tempo real só mexem aqui.
export type MessagePages = InfiniteData<CommunityMessage[], string | undefined>;

function mapPages(
  queryClient: QueryClient,
  channelId: string,
  update: (pages: CommunityMessage[][]) => CommunityMessage[][],
) {
  queryClient.setQueryData<MessagePages>(communityKeys.messages(channelId), (data) =>
    data ? { ...data, pages: update(data.pages) } : data,
  );
}

/** Insere ou substitui. Casa por id e também por clientNonce, para trocar a mensagem otimista
 * pela confirmada — tanto faz se a resposta do POST ou o evento do hub chegar primeiro. */
export function upsertMessage(queryClient: QueryClient, message: CommunityMessage) {
  mapPages(queryClient, message.channelId, (pages) => {
    let replaced = false;
    const next = pages.map((page) =>
      page.map((existing) => {
        const sameNonce =
          message.clientNonce !== null && existing.clientNonce === message.clientNonce;
        if (existing.id === message.id || sameNonce) {
          replaced = true;
          return message;
        }
        return existing;
      }),
    );
    if (replaced) {
      // Resposta do POST + evento do hub podem ter virado duas cópias da mesma mensagem.
      const seen = new Set<string>();
      return next.map((page) =>
        page.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))),
      );
    }
    if (next.length === 0) return [[message]];
    return [[...next[0], message], ...next.slice(1)];
  });
}

export function patchMessage(
  queryClient: QueryClient,
  channelId: string,
  messageId: string,
  patch: Partial<CommunityMessage>,
) {
  mapPages(queryClient, channelId, (pages) =>
    pages.map((page) => page.map((m) => (m.id === messageId ? { ...m, ...patch } : m))),
  );
}

export function removeMessage(queryClient: QueryClient, channelId: string, messageId: string) {
  mapPages(queryClient, channelId, (pages) => pages.map((page) => page.filter((m) => m.id !== messageId)));
}
