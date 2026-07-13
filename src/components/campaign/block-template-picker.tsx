import { useEffect, useRef, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { BLOCK_TEMPLATES, type BlockTemplate } from "@/data/block-templates";
import { cn } from "@/utils/cn";

export function BlockTemplatePicker({
  onSelect,
  disabled,
}: {
  onSelect: (template: BlockTemplate) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const bySystem = BLOCK_TEMPLATES.reduce<Record<string, BlockTemplate[]>>((acc, template) => {
    (acc[template.system] ??= []).push(template);
    return acc;
  }, {});

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <LayoutTemplate className="size-3.5" />
        Template
      </button>

      {open && (
        <div className="border-border/60 bg-popover absolute bottom-full left-0 z-20 mb-1.5 max-h-72 w-64 overflow-y-auto border shadow-xl">
          {Object.entries(bySystem).map(([system, templates]) => (
            <div key={system} className="py-1">
              <div className="text-muted-foreground px-3 py-1 text-[10px] font-semibold tracking-wide uppercase">
                {system}
              </div>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onSelect(template);
                    setOpen(false);
                  }}
                  className="hover:bg-accent/10 flex w-full items-center px-3 py-1.5 text-left text-xs"
                >
                  {template.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
