import type { KeyboardEvent, RefObject } from "react";

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cursor-aware Markdown editing helpers for a plain `<textarea>`. Mirrors the
 * `insertAtCursor` pattern already used ad hoc in TextLikeEditForm/CollapseEditForm
 * (character-tab-section.tsx) so both share one implementation.
 */
export function useMarkdownFormatting({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  const focusSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(start, end);
    });
  };

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + snippet + value.slice(end));
    const pos = start + snippet.length;
    focusSelection(pos, pos);
  };

  /** Wraps the current selection in `before`/`after` (e.g. `**bold**`). With no selection, inserts the pair and places the cursor between them. */
  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));

    if (selected.length > 0) {
      focusSelection(start + before.length, start + before.length + selected.length);
    } else {
      const pos = start + before.length;
      focusSelection(pos, pos);
    }
  };

  /** Toggles a per-line prefix (e.g. `- `, `> `, `### `) across every line touched by the selection. */
  const togglePrefix = (prefix: string, detect: RegExp = new RegExp(`^${escapeRegExp(prefix)}`)) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndRaw = value.indexOf("\n", end);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const allPrefixed = lines.every((line) => line.length === 0 || detect.test(line));

    const nextLines = allPrefixed
      ? lines.map((line) => line.replace(detect, ""))
      : lines.map((line) => (line.length > 0 ? prefix + line : line));

    const nextBlock = nextLines.join("\n");
    onChange(value.slice(0, lineStart) + nextBlock + value.slice(lineEnd));
    focusSelection(start, end + (nextBlock.length - block.length));
  };

  /** Inserts a Markdown link. Selected text becomes the label (cursor lands on the url placeholder); with no selection, inserts a template with "texto" selected. */
  const insertLink = () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    if (selected.length > 0) {
      const linkPrefix = `${before}[${selected}](`;
      onChange(`${linkPrefix}url)${after}`);
      focusSelection(linkPrefix.length, linkPrefix.length + "url".length);
    } else {
      const linkPrefix = `${before}[`;
      onChange(`${linkPrefix}texto](url)${after}`);
      focusSelection(linkPrefix.length, linkPrefix.length + "texto".length);
    }
  };

  const handleShortcut = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      wrapSelection("**");
    } else if (key === "i") {
      event.preventDefault();
      wrapSelection("*");
    }
  };

  return { insertAtCursor, wrapSelection, togglePrefix, insertLink, handleShortcut };
}
