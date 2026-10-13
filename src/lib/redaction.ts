// Internal param: keep the Obsidian doc "Internal params & cookies" in sync.

export const REDACTION_KEYS = ["posterQr", "price", "priceSource"] as const;

export const REDACTION_QUERY_KEY = "redact";
export const REDACTION_BLUR_QUERY_KEY = "redactBlur";
export const REDACTION_STORAGE_KEY = "x-glass:redact";
export const REDACTION_BLUR_STORAGE_KEY = "x-glass:redact:blur";
export const DEFAULT_REDACTION_BLUR_PX = 5;

const ALLOWED = new Set<string>(REDACTION_KEYS);

export function parseKeys(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  return raw.split(",").map((s) => s.trim()).filter((s) => ALLOWED.has(s));
}

export function buildRedactionCss(activeKeys: readonly string[], blurPx: number): string {
  if (activeKeys.length === 0) {
    return "";
  }
  const body = `filter: blur(${blurPx}px) !important; pointer-events: none !important; user-select: none !important;`;
  return activeKeys.map((k) => `[data-redact-hook="${k}"] { ${body} }`).join("\n");
}
