"use client";

// Mounts the demo-mode redaction CSS layer. Activation:
//   ?redact=posterQr,priceSource   — toggle the active set (empty clears)
//   ?redactBlur=8                  — blur radius in px (default 5, empty resets)
// Both params are stripped from the URL after parsing and mirrored to
// localStorage so the effect persists across browser restarts until cleared.
// Caller must wrap this in <Suspense fallback={null}> because useSearchParams
// would otherwise force a CSR bailout on prerendered pages.

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_REDACTION_BLUR_PX,
  REDACTION_BLUR_QUERY_KEY,
  REDACTION_BLUR_STORAGE_KEY,
  REDACTION_QUERY_KEY,
  REDACTION_STORAGE_KEY,
  buildRedactionCss,
  parseKeys,
} from "@/lib/redaction";

const STYLE_ID = "redaction-css";

export default function Redaction() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const rawKeys = searchParams.get(REDACTION_QUERY_KEY);
    const rawBlur = searchParams.get(REDACTION_BLUR_QUERY_KEY);

    let keys: string[];
    if (rawKeys !== null) {
      keys = parseKeys(rawKeys);
      try { localStorage.setItem(REDACTION_STORAGE_KEY, keys.join(",")); } catch {}
    } else {
      try { keys = parseKeys(localStorage.getItem(REDACTION_STORAGE_KEY)); } catch { keys = []; }
    }

    let blur: number;
    if (rawBlur !== null) {
      blur = Number(rawBlur) || DEFAULT_REDACTION_BLUR_PX;
      try { localStorage.setItem(REDACTION_BLUR_STORAGE_KEY, String(blur)); } catch {}
    } else {
      try { blur = Number(localStorage.getItem(REDACTION_BLUR_STORAGE_KEY)) || DEFAULT_REDACTION_BLUR_PX; } catch { blur = DEFAULT_REDACTION_BLUR_PX; }
    }

    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = buildRedactionCss(keys, blur);

    if (rawKeys === null && rawBlur === null) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete(REDACTION_QUERY_KEY);
    next.delete(REDACTION_BLUR_QUERY_KEY);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}
