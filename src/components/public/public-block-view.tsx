import { useState, type CSSProperties } from "react";
import { BookOpen, Boxes } from "lucide-react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { DossierMarkdown } from "@/components/dossier/dossier-markdown";
import { DiceBlockView } from "@/components/campaign/dice-block-view";
import {
  CharacterTabBlockType,
  type BlockAccentColor,
  type CardBlockPayload,
  type CharacterTabBlock,
  type ImageBlockPayload,
  type ImageBlockSize,
  type TableBlockPayload,
} from "@/services/character-tab-block-service";
import { cn } from "@/utils/cn";

const ACCENT_COLOR_VARS: Record<BlockAccentColor, string> = {
  gold: "--primary",
  crimson: "--accent",
  violet: "--dossier-violet",
};

function accentColorValue(color: BlockAccentColor | null | undefined): string | undefined {
  return color ? `hsl(var(${ACCENT_COLOR_VARS[color]}))` : undefined;
}

function accentBorderStyle(color: BlockAccentColor | null | undefined): CSSProperties | undefined {
  const value = accentColorValue(color);
  return value ? { borderLeftColor: value, borderLeftWidth: "3px" } : undefined;
}

function accentTextStyle(color: BlockAccentColor | null | undefined): CSSProperties | undefined {
  const value = accentColorValue(color);
  return value ? { color: value } : undefined;
}

const IMAGE_BLOCK_SIZE_CLASSES: Record<ImageBlockSize, string> = {
  small: "max-w-[200px]",
  medium: "max-w-md",
  large: "max-w-2xl",
  original: "max-w-full",
};

function parseCardPayload(json: string | null): CardBlockPayload {
  if (!json) return { rows: [] };
  try {
    const parsed = JSON.parse(json);
    return { rows: Array.isArray(parsed?.rows) ? parsed.rows : [] };
  } catch {
    return { rows: [] };
  }
}

function parseTablePayload(json: string | null): TableBlockPayload {
  if (!json) return { headers: [], rows: [] };
  try {
    const parsed = JSON.parse(json);
    return {
      headers: Array.isArray(parsed?.headers) ? parsed.headers : [],
      rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
    };
  } catch {
    return { headers: [], rows: [] };
  }
}

function parseImagePayload(json: string | null): ImageBlockPayload {
  if (!json) return { url: "", caption: "", size: "medium", position: "center" };
  try {
    const parsed = JSON.parse(json);
    return {
      url: parsed?.url ?? "",
      caption: parsed?.caption ?? "",
      size: parsed?.size ?? "medium",
      width: typeof parsed?.width === "number" ? parsed.width : undefined,
      position: parsed?.position ?? "center",
    };
  } catch {
    return { url: "", caption: "", size: "medium", position: "center" };
  }
}

function PublicImageBlock({ block }: { block: CharacterTabBlock }) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const payload = parseImagePayload(block.payloadJson);
  const imageSrc = block.imageUrl || payload.url;
  if (!imageSrc) return null;

  const widthStyle: CSSProperties | undefined =
    payload.width !== undefined ? { width: `${payload.width}%` } : undefined;

  return (
    <div className="flex flex-col gap-3">
      <figure
        className={cn(
          "border-border/60 bg-background/40 mx-auto border p-2",
          widthStyle === undefined && IMAGE_BLOCK_SIZE_CLASSES[payload.size],
        )}
        style={widthStyle}
      >
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="block w-full cursor-zoom-in"
          title="Ver em tela cheia"
        >
          <img src={imageSrc} alt={payload.caption || "Imagem"} className="w-full object-cover" />
        </button>
        {payload.caption && (
          <figcaption className="dossier-meta pt-2 text-center text-[10px] tracking-widest uppercase">
            {payload.caption}
          </figcaption>
        )}
      </figure>
      {block.children.length > 0 && (
        <div className="space-y-3">
          {block.children.map((child) => (
            <PublicBlockView key={child.id} block={child} />
          ))}
        </div>
      )}
      {isLightboxOpen && (
        <ImageLightbox
          src={imageSrc}
          alt={payload.caption || "Imagem"}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
}

function PublicCollapseBlock({ block }: { block: CharacterTabBlock }) {
  return (
    <details className="bg-card/40 border-border/60 border px-4 py-3" style={accentBorderStyle(block.accentColor)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          {block.imageUrl && (
            <img
              src={block.imageUrl}
              alt=""
              className="border-border/60 size-16 shrink-0 rounded-sm border object-cover"
            />
          )}
          <div className="min-w-0">
            <div
              className="font-display truncate text-base"
              style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
            >
              {block.title || "Sem título"}
            </div>
            {block.meta && <div className="dossier-meta text-xs">{block.meta}</div>}
          </div>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">▾</span>
      </summary>
      <div className="border-border/60 mt-3 flex flex-col gap-4 border-t pt-3">
        {block.content && <DossierMarkdown text={block.content} />}
        {block.children.length > 0 && (
          <div className="border-border/60 flex flex-col gap-3 border-t border-dashed pt-3">
            {block.children.map((child) => (
              <PublicBlockView key={child.id} block={child} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

function PublicGroupBlock({ block }: { block: CharacterTabBlock }) {
  return (
    <details
      open
      className="bg-card/40 border-border/60 border px-4 py-3"
      style={accentBorderStyle(block.accentColor)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <Boxes
            className="size-4 shrink-0"
            style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
          />
          <div className="min-w-0">
            <div
              className="font-display truncate text-base"
              style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
            >
              {block.title || "Sem título"}
            </div>
            {block.meta && <div className="dossier-meta text-xs">{block.meta}</div>}
          </div>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">▾</span>
      </summary>
      <div className="border-border/60 mt-3 flex flex-col gap-4 border-t pt-3">
        {block.content && <DossierMarkdown text={block.content} />}
        {block.children.length > 0 && (
          <div className="flex flex-col gap-3">
            {block.children.map((child) => (
              <PublicBlockView key={child.id} block={child} />
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export function PublicBlockView({ block }: { block: CharacterTabBlock }) {
  switch (block.type) {
    case CharacterTabBlockType.Text:
      return block.content ? <DossierMarkdown text={block.content} /> : null;

    case CharacterTabBlockType.Quote:
      return block.content ? (
        <div className="dossier-quote">
          <DossierMarkdown text={block.content} />
        </div>
      ) : null;

    case CharacterTabBlockType.Card: {
      const payload = parseCardPayload(block.payloadJson);
      return (
        <div className="bg-card/40 border-border/60 border px-4 py-3" style={accentBorderStyle(block.accentColor)}>
          {block.title && (
            <div
              className="font-display mb-2 text-sm"
              style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
            >
              {block.title}
            </div>
          )}
          {payload.rows.length > 0 && (
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {payload.rows.map((row, i) => (
                <div
                  key={i}
                  className="border-border/60 flex items-center justify-between border-b border-dotted py-2 last:border-b-0"
                >
                  <span className="dossier-meta text-xs">{row.k}</span>
                  <span className="font-display text-primary text-sm">{row.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case CharacterTabBlockType.Table: {
      const payload = parseTablePayload(block.payloadJson);
      if (payload.headers.length === 0) return null;
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {payload.headers.map((header, i) => (
                  <th
                    key={i}
                    className="font-display text-primary border-border/60 border-b px-2 py-1.5 text-left text-xs tracking-wide uppercase"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payload.rows.map((row, ri) => (
                <tr key={ri} className="border-border/60 border-b">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1.5 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case CharacterTabBlockType.Image:
      return <PublicImageBlock block={block} />;

    case CharacterTabBlockType.Divider:
      return <hr className="border-border/60" />;

    case CharacterTabBlockType.Collapse:
      return <PublicCollapseBlock block={block} />;

    case CharacterTabBlockType.Group:
      return <PublicGroupBlock block={block} />;

    case CharacterTabBlockType.Dice:
      return <DiceBlockView block={block} />;

    case CharacterTabBlockType.Book:
      return (
        <div
          className="bg-card/40 border-border/60 flex w-full items-center gap-4 border px-4 py-3"
          style={accentBorderStyle(block.accentColor)}
        >
          <BookOpen className="text-primary size-8 shrink-0" />
          <div
            className="font-display truncate text-base"
            style={accentTextStyle(block.accentColor) ?? { color: "hsl(var(--primary))" }}
          >
            {block.title || "Livro"}
          </div>
        </div>
      );

    default:
      return null;
  }
}
