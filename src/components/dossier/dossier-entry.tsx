import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function DossierEntry({
  title,
  badge,
  meta,
  defaultOpen = false,
  className,
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        "group border-border/60 bg-card/70 border backdrop-blur-xl",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-primary text-base">{title}</span>
          {badge}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {meta && <span className="dossier-meta text-xs">{meta}</span>}
          <span className="text-muted-foreground text-xs transition-transform group-open:rotate-180">
            ▾
          </span>
        </div>
      </summary>
      <div className="border-border/60 space-y-3 border-t px-5 py-4">{children}</div>
    </details>
  );
}
