import type { CSSProperties } from "react";
import type { BlockAccentColor } from "@/services/character-tab-block-service";

// Raw HSL triplets matching the `.dossier-theme` CSS variables in `Front/src/app/styles.css` —
// overriding --primary/--ring with one of these makes the whole page (name, tab frame corners,
// active tab) cascade to the character's chosen accent, since those elements already read --primary.
const CHARACTER_ACCENT_HSL: Record<BlockAccentColor, string> = {
  gold: "41 57% 59%",
  crimson: "348 67% 60%",
  violet: "257 31% 55%",
};

export function characterAccentStyle(color: BlockAccentColor | null | undefined): CSSProperties | undefined {
  if (!color) return undefined;
  const hsl = CHARACTER_ACCENT_HSL[color];
  return { "--primary": hsl, "--ring": hsl } as CSSProperties;
}
