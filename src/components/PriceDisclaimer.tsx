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
    <p
      className={cn(
        "leading-relaxed",
        compact ? "text-[10px]" : "text-[11px]",
        PRICE_DISCLAIMER_BODY_CLS,
        className,
      )}
    >
      <TriangleAlert
        className={cn(
          PRICE_DISCLAIMER_ICON_CLS,
          "inline-block align-text-bottom mr-1",
          compact ? "size-3" : "size-3.5",
        )}
        aria-hidden="true"
      />
      <span className={PRICE_DISCLAIMER_WARN_CLS}>{t("disclaimerLead")}</span>
      {" "}
      {t("disclaimerBody")}
    </p>
  );
}
