import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { useLinkableBlocks, type LinkableBlock } from "@/hooks/use-linkable-blocks";
import { getCaretOffset } from "@/utils/caret-position";

const TRIGGER_CHAR = "@";
const MAX_SUGGESTIONS = 8;
// Matches MentionDropdown's rendered size (w-64 = 256px, max-h-56 = 224px + border).
const DROPDOWN_WIDTH = 256;
const DROPDOWN_HEIGHT = 230;

export function useMentionAutocomplete({
  characterId,
  excludeBlockId,
  textareaRef,
  onChange,
}: {
  characterId: string;
  excludeBlockId?: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (next: string) => void;
}) {
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const isOpen = triggerStart !== null;
  const linkableQuery = useLinkableBlocks(characterId, isOpen);

  const options = isOpen
    ? (linkableQuery.data ?? [])
        .filter((b) => b.id !== excludeBlockId && b.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, MAX_SUGGESTIONS)
    : [];

  const close = () => {
    setTriggerStart(null);
    setQuery("");
    setPosition(null);
  };

  const sync = () => {
    const el = textareaRef.current;
    if (!el) {
      close();
      return;
    }

    const caret = el.selectionStart ?? 0;
    const textBeforeCaret = el.value.slice(0, caret);
    const atIndex = textBeforeCaret.lastIndexOf(TRIGGER_CHAR);

    if (atIndex === -1) {
      close();
      return;
    }

    const between = textBeforeCaret.slice(atIndex + 1);
    if (/\s/.test(between)) {
      close();
      return;
    }

    const charBeforeAt = atIndex > 0 ? textBeforeCaret[atIndex - 1] : " ";
    if (atIndex !== 0 && !/\s/.test(charBeforeAt)) {
      close();
      return;
    }

    setTriggerStart(atIndex);
    setQuery(between);
    setActiveIndex(0);

    const offset = getCaretOffset(el, caret);
    const rect = el.getBoundingClientRect();

    // Position relative to the viewport (the dropdown is portaled to <body> and
    // rendered `fixed`). Flip based on which half of the *textarea's own visible
    // area* the caret sits in, rather than raw viewport space: a caret near the
    // bottom of even a short textarea sits right next to whatever follows it in the
    // form (e.g. the Salvar/Cancelar row), so "plenty of room in the viewport" isn't
    // actually enough to avoid a collision there.
    const openUpward = offset.top > el.clientHeight / 2;
    const caretTop = rect.top + offset.top;
    const caretBottom = caretTop + offset.height;
    const top = openUpward ? caretTop - DROPDOWN_HEIGHT - 4 : caretBottom + 4;

    const caretLeft = rect.left + offset.left;
    const left = Math.max(0, Math.min(caretLeft, window.innerWidth - DROPDOWN_WIDTH));

    setPosition({ top, left });
  };

  const select = (block: LinkableBlock) => {
    const el = textareaRef.current;
    if (!el || triggerStart === null) return;

    const caret = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, triggerStart);
    const after = el.value.slice(caret);
    const snippet = `[${block.title}](block:${block.id})`;
    const next = before + snippet + after;

    onChange(next);
    close();

    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const el = textareaRef.current;
      if (el && !el.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      select(options[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return {
    isOpen,
    options,
    activeIndex,
    position,
    isLoading: linkableQuery.isLoading,
    setActiveIndex,
    select,
    close,
    handleChange: sync,
    handleSelectionChange: sync,
    handleKeyDown,
  };
}
