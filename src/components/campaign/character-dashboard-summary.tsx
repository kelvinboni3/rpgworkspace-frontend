import { ChevronDown, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useCollapsedCard } from "@/hooks/use-collapsed-card";
import type { CharacterDashboard } from "@/services/character-service";
import { CHARACTER_TAB_BLOCK_TYPE_LABELS } from "@/services/character-tab-block-service";
import { cn } from "@/utils/cn";

export function CharacterDashboardSummary({
  characterId,
  dashboard,
}: {
  characterId: string;
  dashboard: CharacterDashboard;
}) {
  const { isCollapsed, toggleCollapsed } = useCollapsedCard(`dashboard-summary:${characterId}`);

  if (dashboard.recentBlocks.length === 0) return null;

  return (
    <Card className="glass-panel p-4">
      <button
        type="button"
        onClick={toggleCollapsed}
        title={isCollapsed ? "Expandir" : "Recolher"}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Layers className="text-primary size-4" />
          Atualizado recentemente
        </h3>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            !isCollapsed && "rotate-180",
          )}
        />
      </button>
      {!isCollapsed && (
        <ul className="mt-3 space-y-2">
          {dashboard.recentBlocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground truncate">
                {block.title ?? CHARACTER_TAB_BLOCK_TYPE_LABELS[block.type]}
              </span>
              <span className="dossier-meta shrink-0 text-xs">
                {block.tabName} · {new Date(block.updatedAt).toLocaleDateString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
