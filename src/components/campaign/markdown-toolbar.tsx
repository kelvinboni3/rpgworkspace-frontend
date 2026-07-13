import { Bold, Italic, Heading2, List, ListOrdered, Quote, Minus, Link2 } from "lucide-react";
import { cn } from "@/utils/cn";

type MarkdownFormatting = {
  wrapSelection: (before: string, after?: string) => void;
  togglePrefix: (prefix: string, detect?: RegExp) => void;
  insertAtCursor: (snippet: string) => void;
  insertLink: () => void;
};

export function MarkdownToolbar({
  formatting,
  disabled,
}: {
  formatting: MarkdownFormatting;
  disabled?: boolean;
}) {
  const buttons: { label: string; icon: typeof Bold; onClick: () => void }[] = [
    { label: "Negrito (Ctrl+B)", icon: Bold, onClick: () => formatting.wrapSelection("**") },
    { label: "Itálico (Ctrl+I)", icon: Italic, onClick: () => formatting.wrapSelection("*") },
    { label: "Título", icon: Heading2, onClick: () => formatting.togglePrefix("### ") },
    { label: "Lista", icon: List, onClick: () => formatting.togglePrefix("- ") },
    {
      label: "Lista numerada",
      icon: ListOrdered,
      onClick: () => formatting.togglePrefix("1. ", /^\d+\.\s/),
    },
    { label: "Citação", icon: Quote, onClick: () => formatting.togglePrefix("> ") },
    { label: "Link", icon: Link2, onClick: () => formatting.insertLink() },
    { label: "Divisor", icon: Minus, onClick: () => formatting.insertAtCursor("\n\n---\n\n") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {buttons.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          title={label}
          aria-label={label}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          className={cn(
            "text-muted-foreground hover:text-foreground hover:bg-accent/10 inline-flex items-center justify-center rounded-sm p-1.5 transition-colors",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
