import type { PropsWithChildren, ReactNode } from "react";
import { BookOpenText, Dices, ScrollText, Swords } from "lucide-react";

const FEATURES: Array<{ icon: ReactNode; label: string }> = [
  { icon: <Swords className="size-4" />, label: "Campanhas, sessões e NPCs organizados por workspace" },
  { icon: <ScrollText className="size-4" />, label: "Diário de investigação privado para cada personagem" },
  { icon: <BookOpenText className="size-4" />, label: "Wiki e biblioteca de mundo compartilhadas com a mesa" },
];

type AuthShellProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="hub-backdrop flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="hidden flex-col gap-8 lg:flex">
          <div className="flex items-center gap-3">
            <div className="bg-primary/15 text-primary shadow-glow flex size-12 items-center justify-center rounded-2xl">
              <Dices className="size-6" />
            </div>
            <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              RPG Workspace
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="font-display text-gradient text-4xl leading-tight font-bold text-balance xl:text-5xl">
              Sua mesa de RPG, organizada num único hub.
            </h1>
            <p className="text-muted-foreground max-w-md text-base text-pretty">
              Centralize campanhas, NPCs, locais e quests — e dê a cada
              jogador seu próprio espaço para teorias, anotações e segredos.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.label}
                className="text-foreground/80 flex items-start gap-3 text-sm"
              >
                <span className="bg-primary/10 text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                  {feature.icon}
                </span>
                {feature.label}
              </li>
            ))}
          </ul>

          <div
            aria-hidden
            className="bg-primary/30 absolute -z-10 size-72 animate-float rounded-full blur-3xl"
          />
        </div>

        <div className="animate-fade-in-up glass-panel glow-ring w-full p-8 sm:p-10">
          <div className="mb-8 flex flex-col gap-2 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-xl">
                <Dices className="size-5" />
              </div>
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                RPG Workspace
              </span>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <h2 className="font-display text-2xl font-semibold">{title}</h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
