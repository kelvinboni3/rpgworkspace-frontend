import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CharacterDashboard } from "@/services/character-service";
import { CHARACTER_TAB_BLOCK_TYPE_LABELS } from "@/services/character-tab-block-service";

export function CharacterDashboardSummary({ dashboard }: { dashboard: CharacterDashboard }) {
  if (dashboard.recentBlocks.length === 0) return null;

  return (
    <Card className="glass-panel p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <Layers className="text-primary size-4" />
        Atualizado recentemente
      </h3>
      <ul className="space-y-2">
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
    </Card>
  );
}
