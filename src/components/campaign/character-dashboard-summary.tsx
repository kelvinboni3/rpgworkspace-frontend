import type { LucideIcon } from "lucide-react";
import { BookOpen, Lightbulb, Scroll, Target, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CharacterDashboard } from "@/services/character-service";
import { cn } from "@/utils/cn";

// Local display-only labels: the canonical Theory/ImportantPerson label
// records live in their own service files (Phase 3/4), which don't exist
// yet. This summary only reads these values, never writes them.
const THEORY_STATUS_LABELS: Record<number, string> = {
  1: "Ativa",
  2: "Confirmada",
  3: "Refutada",
  4: "Arquivada",
};

const IMPORTANT_PERSON_TYPE_LABELS: Record<number, string> = {
  1: "NPC",
  2: "Personagem",
  3: "Facção",
  4: "Criatura",
  5: "Organização",
  6: "Outro",
};

const EVALUATION_LEVEL_LABELS: Record<number, string> = {
  0: "Nenhum",
  1: "Baixo",
  2: "Médio",
  3: "Alto",
  4: "Crítico",
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "primary" | "accent" | "secondary";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    secondary: "bg-secondary text-secondary-foreground",
  }[tone];

  return (
    <Card className="glass-panel flex items-center gap-3 p-4">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", toneClass)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-display text-2xl leading-none font-bold">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </Card>
  );
}

export function CharacterDashboardSummary({ dashboard }: { dashboard: CharacterDashboard }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Lightbulb} label="Teorias ativas" value={dashboard.activeTheoriesCount} tone="accent" />
        <StatTile icon={Target} label="Operações ativas" value={dashboard.activeOperationsCount} tone="primary" />
        <StatTile icon={Users} label="Pessoas importantes" value={dashboard.importantPeopleCount} tone="secondary" />
        <StatTile icon={Scroll} label="Itens narrativos" value={dashboard.narrativeItemsCount} tone="secondary" />
      </div>

      {(dashboard.recentNotes.length > 0 ||
        dashboard.activeTheories.length > 0 ||
        dashboard.importantPeopleHighlights.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {dashboard.recentNotes.length > 0 && (
            <Card className="glass-panel p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <BookOpen className="text-primary size-4" />
                Notas recentes
              </h3>
              <ul className="space-y-2">
                {dashboard.recentNotes.map((note) => (
                  <li key={note.id} className="text-muted-foreground truncate text-sm">
                    {note.title}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {dashboard.activeTheories.length > 0 && (
            <Card className="glass-panel p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb className="text-accent size-4" />
                Teorias em destaque
              </h3>
              <ul className="space-y-2">
                {dashboard.activeTheories.map((theory) => (
                  <li key={theory.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground truncate">{theory.title}</span>
                    <span className="bg-accent/15 text-accent shrink-0 rounded-full px-2 py-0.5 text-xs">
                      {theory.confidence}% · {THEORY_STATUS_LABELS[theory.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {dashboard.importantPeopleHighlights.length > 0 && (
            <Card className="glass-panel p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Users className="text-secondary-foreground size-4" />
                Pessoas em destaque
              </h3>
              <ul className="space-y-2">
                {dashboard.importantPeopleHighlights.map((person) => (
                  <li key={person.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground truncate">{person.name}</span>
                      <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-xs">
                        {IMPORTANT_PERSON_TYPE_LABELS[person.type]}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Risco: {EVALUATION_LEVEL_LABELS[person.riskLevel]} · Confiança:{" "}
                      {EVALUATION_LEVEL_LABELS[person.trustLevel]}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
