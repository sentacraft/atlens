"use client";

// Inline price disclaimer block.
//
// Reads as one continuous paragraph: a sentence-style lead (e.g. "市场
// 行情，仅供参考。") in amber, followed by the body in the zinc caption
// color — no middle-dot separator, just whitespace, so the two pieces
// flow as a single statement.

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PRICE_DISCLAIMER_BODY_CLS,
  PRICE_DISCLAIMER_ICON_CLS,
  PRICE_DISCLAIMER_WARN_CLS,
} from "@/lib/ui-tokens";
import { cn } from "@/lib/utils";

interface Props {
  /** Tighter text for compact contexts (compare table footer, poster). */
  compact?: boolean;
  className?: string;
}

export function PriceDisclaimer({ compact = false, className }: Props) {
  const t = useTranslations("Pricing");
  return (
    <div
      className={cn(
        "flex items-start gap-1.5 leading-relaxed",
        compact ? "text-[11px]" : "text-xs",
        className,
      )}
    >
      <TriangleAlert
        className={cn(PRICE_DISCLAIMER_ICON_CLS, compact ? "size-3 mt-px" : "size-3.5 mt-px")}
        aria-hidden="true"
      />
      <span className={PRICE_DISCLAIMER_BODY_CLS}>
        <span className={PRICE_DISCLAIMER_WARN_CLS}>{t("disclaimerLead")}</span>
        {" "}
        {t("disclaimerBody")}
      </span>
    </div>
  );
}
