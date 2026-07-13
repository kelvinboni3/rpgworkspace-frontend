import { useEffect } from "react";
import { createPortal } from "react-dom";
import { UserRound, X } from "lucide-react";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import type { BlockAccentColor } from "@/services/character-tab-block-service";
import { characterAccentStyle } from "@/utils/character-accent";

export function CharacterRetrospectivePoster({
  name,
  race,
  class: characterClass,
  level,
  portraitSrc,
  retrospectiveText,
  accentColor,
  onClose,
}: {
  name: string;
  race: string | null;
  class: string | null;
  level: number;
  portraitSrc: string | null;
  retrospectiveText: string;
  accentColor: BlockAccentColor | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const subtitle = [`Nível ${level}`, race, characterClass].filter(Boolean).join(" · ");

  return createPortal(
    <div
      className="dossier-theme fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-6"
      style={characterAccentStyle(accentColor)}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        title="Fechar"
        className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="size-5" />
      </button>

      <div
        className="dossier-frame bg-background/95 w-full max-w-lg space-y-4 px-8 py-10 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {portraitSrc ? (
          <img
            src={portraitSrc}
            alt="Retrato do personagem"
            className="border-primary/40 mx-auto size-24 rounded-full border-2 object-cover"
          />
        ) : (
          <div className="border-primary/40 text-muted-foreground mx-auto flex size-24 items-center justify-center rounded-full border-2">
            <UserRound className="size-10" />
          </div>
        )}

        <div>
          <div className="dossier-eyebrow">Retrospectiva</div>
          <h2 className="font-display text-primary text-3xl font-bold">{name}</h2>
          {subtitle && <p className="dossier-meta text-xs">{subtitle}</p>}
        </div>

        <div className="dossier-quote text-left">
          <DossierMarkdown text={retrospectiveText} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
