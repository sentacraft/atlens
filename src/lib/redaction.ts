// Demo-mode redaction layer.
//
// Independent of TestHooks — always available, including in production. Driven
// purely by a URL query param (?redact=key1,key2) and a sessionStorage echo so
// the effect persists across in-app navigations after the URL is cleaned.
//
// To add a new redactable surface:
//   1. Append an entry to REDACTION_TARGETS below.
//   2. Add `data-redact-hook="<key>"` to the element that should blur.
// The CSS applies blur + pointer/select suppression so the surface can't be
// scanned, hovered into a popover, or copied while active.

import type { ReadonlyURLSearchParams } from "next/navigation";

export const REDACTION_QUERY_KEY = "redact";
export const REDACTION_BLUR_QUERY_KEY = "redactBlur";
// localStorage so the setting persists across tab close / browser restart —
// the demo state survives any number of sessions until explicitly cleared
// with `?redact=`.
export const REDACTION_STORAGE_KEY = "x-glass:redact";
export const REDACTION_BLUR_STORAGE_KEY = "x-glass:redact:blur";
export const REDACTION_ATTR = "data-redact-hook";

// Light enough to leave the surrounding layout untouched while still defeating
// OCR / QR-scanner pipelines on the channel-name string. Override per session
// with ?redactBlur=<px>.
export const DEFAULT_REDACTION_BLUR_PX = 5;
const MIN_REDACTION_BLUR_PX = 1;
const MAX_REDACTION_BLUR_PX = 40;

export interface RedactionTarget {
  key: string;
  label: string;
  description: string;
  selector: string;
}

export const REDACTION_TARGETS: readonly RedactionTarget[] = [
  {
    key: "posterQr",
    label: "Poster QR code",
    description: "Blur the QR code inside share posters.",
    selector: `[${REDACTION_ATTR}="posterQr"]`,
  },
  {
    key: "priceSource",
    label: "Price source channel",
    description: "Blur the channel-name caption (e.g. JD flagship, Xianyu) under each price. Price value and sampled date stay visible.",
    selector: `[${REDACTION_ATTR}="priceSource"]`,
  },
];

const REDACTION_KEYS = new Set(REDACTION_TARGETS.map((t) => t.key));

// Parses the raw query value. Returns null when the param is absent (caller
// should leave existing state alone); returns the validated key list when
// present, including the empty array for an explicit clear (?redact=).
export function parseRedactionParam(raw: string | null): readonly string[] | null {
  if (raw === null) {
    return null;
  }
  if (raw === "") {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const key = part.trim();
    if (key && REDACTION_KEYS.has(key) && !seen.has(key)) {
      seen.add(key);
      result.push(key);
    }
  }
  return result;
}

export function readRedactionParam(
  input: URLSearchParams | ReadonlyURLSearchParams
): readonly string[] | null {
  return parseRedactionParam(input.get(REDACTION_QUERY_KEY));
}

export function serializeRedactionKeys(keys: readonly string[]): string {
  return keys.join(",");
}

// Returns null when the param is absent or unparseable; caller should fall
// back to existing state / default. Empty string is treated as "reset".
export function parseRedactionBlur(raw: string | null): number | null {
  if (raw === null || raw === "") {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.min(MAX_REDACTION_BLUR_PX, Math.max(MIN_REDACTION_BLUR_PX, Math.round(n)));
}

export function readRedactionBlur(
  input: URLSearchParams | ReadonlyURLSearchParams
): number | null {
  const raw = input.get(REDACTION_BLUR_QUERY_KEY);
  // An explicit `?redactBlur=` resets to default; treat as a clear signal.
  if (raw === "") {
    return DEFAULT_REDACTION_BLUR_PX;
  }
  return parseRedactionBlur(raw);
}

export function buildRedactionCss(
  activeKeys: readonly string[],
  blurPx: number = DEFAULT_REDACTION_BLUR_PX
): string {
  if (activeKeys.length === 0) {
    return "";
  }
  // pointer-events: none also stops the Used-badge popover from leaking
  // copy on hover during demo capture.
  const body = `filter: blur(${blurPx}px) !important; pointer-events: none !important; user-select: none !important;`;
  const active = new Set(activeKeys);
  return REDACTION_TARGETS.filter((t) => active.has(t.key))
    .map((t) => `${t.selector} { ${body} }`)
    .join("\n");
}
