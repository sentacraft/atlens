/** A piece of visible text that runs outside its box, or two pieces of text drawn over each other. */
export interface TextProblem {
  kind: "overflow" | "overlap";
  text: string;
  other?: string;
}

/**
 * Runs in the page. Checks every visible text node: its glyphs must stay inside the nearest
 * block-level ancestor, unless that box deliberately clips or scrolls (`truncate`, `line-clamp`,
 * a scrolling tab row); and no two text nodes may share more than a few pixels, line by line. Text
 * in hidden, `aria-hidden` or `inert` subtrees, and in fixed or sticky overlays, is skipped.
 */
export function findTextProblems(): TextProblem[] {
  const SLACK = 1;
  const MIN_OVERLAP = 3;
  const problems: TextProblem[] = [];
  const blockDisplays = new Set(["block", "flex", "grid", "table-cell", "list-item", "flow-root", "inline-block", "inline-flex", "inline-grid"]);
  const clips = (style: CSSStyleDeclaration) =>
    style.overflowX !== "visible" || style.textOverflow === "ellipsis" || style.webkitLineClamp !== "none";

  const hidden = (el: Element) => el.closest('[aria-hidden="true"], [inert], [hidden]') !== null;
  const floating = (el: Element) => {
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      const position = getComputedStyle(e).position;
      if (position === "fixed" || position === "sticky") {
        return true;
      }
    }
    return false;
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });

  const lines: { text: string; rect: DOMRect; el: Element }[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || hidden(parent) || floating(parent) || parent.closest("script, style, noscript, svg")) {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || Number(style.opacity) === 0) {
      continue;
    }
    const text = node.textContent!.trim().slice(0, 60);
    for (const line of range.getClientRects()) {
      if (line.width > 0 && line.height > 0) {
        lines.push({ text, rect: line, el: parent });
      }
    }

    let box: Element | null = parent;
    let clipped = false;
    while (box && box !== document.body) {
      const boxStyle = getComputedStyle(box);
      if (clips(boxStyle)) {
        clipped = true;
        break;
      }
      if (blockDisplays.has(boxStyle.display)) {
        break;
      }
      box = box.parentElement;
    }
    if (clipped || !box || box === document.body) {
      continue;
    }
    const outer = box.getBoundingClientRect();
    if (rect.right > outer.right + SLACK || rect.left < outer.left - SLACK) {
      problems.push({ kind: "overflow", text });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) {
        continue;
      }
      const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (w > MIN_OVERLAP && h > MIN_OVERLAP) {
        problems.push({ kind: "overlap", text: a.text, other: b.text });
      }
    }
  }
  return problems;
}
