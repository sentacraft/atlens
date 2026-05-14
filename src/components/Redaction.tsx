"use client";

// Mounts the demo-mode redaction CSS layer. See lib/redaction.ts for the
// target registry. Activation contract:
//   - `?redact=posterQr,priceSource` on any URL turns those targets on; the
//     param is stripped from the address bar after parsing so screen
//     recordings don't expose it.
//   - `?redactBlur=<px>` overrides the blur radius (default 5px).
//   - The active set is mirrored to localStorage so it persists across tab
//     close / browser restart until explicitly cleared.
//   - `?redact=` (empty value) clears the active set; `?redactBlur=`
//     resets the blur radius back to the default.
//
// Caller (layout.tsx) must wrap this in <Suspense fallback={null}> because
// useSearchParams forces CSR bailout on prerendered pages otherwise.
//
// The component holds no React state — the only consumer of the active set
// is a single <style> element in document.head, which we update imperatively.

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_REDACTION_BLUR_PX,
  REDACTION_BLUR_QUERY_KEY,
  REDACTION_BLUR_STORAGE_KEY,
  REDACTION_QUERY_KEY,
  REDACTION_STORAGE_KEY,
  buildRedactionCss,
  parseRedactionBlur,
  parseRedactionParam,
  serializeRedactionKeys,
} from "@/lib/redaction";

const STYLE_ELEMENT_ID = "redaction-css";

function applyCss(activeKeys: readonly string[], blurPx: number): void {
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  el.textContent = buildRedactionCss(activeKeys, blurPx);
}

function readStoredKeys(): readonly string[] {
  try {
    const stored = localStorage.getItem(REDACTION_STORAGE_KEY);
    if (stored === null) {
      return [];
    }
    return stored ? stored.split(",").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readStoredBlur(): number {
  try {
    const raw = localStorage.getItem(REDACTION_BLUR_STORAGE_KEY);
    return parseRedactionBlur(raw) ?? DEFAULT_REDACTION_BLUR_PX;
  } catch {
    return DEFAULT_REDACTION_BLUR_PX;
  }
}

function writeStoredKeys(keys: readonly string[]): void {
  try {
    localStorage.setItem(REDACTION_STORAGE_KEY, serializeRedactionKeys(keys));
  } catch {
    // localStorage unavailable — applied for this page load only.
  }
}

function writeStoredBlur(px: number): void {
  try {
    localStorage.setItem(REDACTION_BLUR_STORAGE_KEY, String(px));
  } catch {
    // localStorage unavailable — applied for this page load only.
  }
}

export default function Redaction() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawKeys = searchParams.get(REDACTION_QUERY_KEY);
    const rawBlur = searchParams.get(REDACTION_BLUR_QUERY_KEY);

    let keys: readonly string[];
    if (rawKeys !== null) {
      keys = parseRedactionParam(rawKeys) ?? [];
      writeStoredKeys(keys);
    } else {
      keys = readStoredKeys();
    }

    let blurPx: number;
    if (rawBlur !== null) {
      // Empty value = reset to default. Out-of-range = ignored (keep prior).
      const parsed = rawBlur === "" ? DEFAULT_REDACTION_BLUR_PX : parseRedactionBlur(rawBlur);
      blurPx = parsed ?? readStoredBlur();
      if (parsed !== null) {
        writeStoredBlur(blurPx);
      }
    } else {
      blurPx = readStoredBlur();
    }

    applyCss(keys, blurPx);

    if (rawKeys === null && rawBlur === null) {
      return;
    }

    // Strip both params so screen recordings of the address bar stay clean.
    const next = new URLSearchParams(searchParams.toString());
    next.delete(REDACTION_QUERY_KEY);
    next.delete(REDACTION_BLUR_QUERY_KEY);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
