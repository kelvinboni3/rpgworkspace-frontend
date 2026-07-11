import { useQuery } from "@tanstack/react-query";
import { CharacterTabService } from "@/services/character-tab-service";
import { CharacterTabBlockService, type CharacterTabBlock } from "@/services/character-tab-block-service";

export type LinkableBlock = {
  id: string;
  title: string;
  tabName: string;
};

function collectLinkable(blocks: CharacterTabBlock[], tabName: string, acc: LinkableBlock[]) {
  for (const block of blocks) {
    if (block.title?.trim()) acc.push({ id: block.id, title: block.title.trim(), tabName });
    if (block.children.length > 0) collectLinkable(block.children, tabName, acc);
  }
}

export function useLinkableBlocks(characterId: string, enabled: boolean) {
  const tabsQuery = useQuery({
    queryKey: ["characters", characterId, "tabs"],
    queryFn: () => CharacterTabService.getAllByCharacter(characterId),
    enabled,
  });

  const tabIds = tabsQuery.data?.map((t) => t.id) ?? [];

  return useQuery({
    queryKey: ["characters", characterId, "linkable-blocks", tabIds],
    queryFn: async () => {
      const tabs = tabsQuery.data ?? [];
      const perTab = await Promise.all(
        tabs.map(async (tab) => ({ tab, blocks: await CharacterTabBlockService.getAllByTab(tab.id) })),
      );
      const linkable: LinkableBlock[] = [];
      for (const { tab, blocks } of perTab) collectLinkable(blocks, tab.name, linkable);
      return linkable;
    },
    enabled: enabled && tabIds.length > 0,
  });
}
