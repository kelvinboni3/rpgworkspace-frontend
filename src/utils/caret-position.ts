const MIRRORED_PROPERTIES = [
  "boxSizing",
  "width",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "textTransform",
  "wordSpacing",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "whiteSpace",
  "wordWrap",
] as const;

/**
 * Computes the pixel offset of a caret position inside a <textarea>, relative to the
 * textarea's own top-left corner. Textareas have no native API for this, so this renders
 * an invisible "mirror" div with identical text-flow styling to measure where the text
 * before `position` wraps to.
 */
export function getCaretOffset(textarea: HTMLTextAreaElement, position: number) {
  const div = document.createElement("div");
  const style = window.getComputedStyle(textarea);

  for (const prop of MIRRORED_PROPERTIES) {
    div.style[prop] = style[prop];
  }

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.top = "0";
  div.style.left = "-9999px";

  document.body.appendChild(div);

  div.textContent = textarea.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(position) || ".";
  div.appendChild(span);

  const offset = {
    top: span.offsetTop - textarea.scrollTop,
    left: span.offsetLeft - textarea.scrollLeft,
    height: span.offsetHeight,
  };

  document.body.removeChild(div);
  return offset;
}
