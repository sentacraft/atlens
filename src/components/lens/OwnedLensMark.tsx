"use client";

import OwnedMark from "@/components/lens/OwnedMark";
import { useIsOwnedLens } from "@/hooks/useIsOwnedLens";

/** `OwnedMark` for a catalog lens the page lists, read from the signed-in user's gear; guests and loading show nothing. */
export default function OwnedLensMark({ lensId, form, className }: { lensId: string; form: "corner" | "dot" | "inline"; className?: string }) {
  return useIsOwnedLens(lensId) ? <OwnedMark form={form} className={className} /> : null;
}
