"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  OWNED_MARK_CHECK_CLS,
  OWNED_MARK_CORNER_CLS,
  OWNED_MARK_DOT_CLS,
  OWNED_MARK_INLINE_CLS,
} from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

/**
 * Says the user already owns this lens. Pick the form by where the lens is shown:
 * `corner` on the top-left of a thumbnail (a card's image well), `dot` on a dense thumbnail where
 * the label would not fit (its name is the accessible name and tooltip), `inline` after a name
 * where there is no thumbnail (a table row). `corner` and `dot` position themselves absolutely, so
 * the thumbnail's box must be `relative`; `className` adjusts that placement.
 */
export default function OwnedMark({ form, className }: { form: "corner" | "dot" | "inline"; className?: string }) {
  const label = useTranslations("LensActions")("owned");
  if (form === "dot") {
    return (
      <span role="img" aria-label={label} title={label} className={cn(OWNED_MARK_DOT_CLS, className)}>
        <Check className="size-[11px]" strokeWidth={3} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className={cn(form === "corner" ? OWNED_MARK_CORNER_CLS : OWNED_MARK_INLINE_CLS, className)}>
      <Check className={OWNED_MARK_CHECK_CLS} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
