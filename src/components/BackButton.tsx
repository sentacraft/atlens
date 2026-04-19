"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ICON_NAV_BTN_CLS } from "@/lib/ui-tokens";

interface BackButtonProps {
  fallbackHref: string;
  className?: string;
}

/**
 * Navigates to `fallbackHref`. The destination is determined by the caller —
 * use URL `?from=` params to pass context-aware targets.
 */
export default function BackButton({ fallbackHref, className }: BackButtonProps) {
  const router = useRouter();
  const t = useTranslations("Common");

  return (
    <button
      type="button"
      onClick={() => router.push(fallbackHref)}
      className={cn(ICON_NAV_BTN_CLS, "h-8 w-8", className)}
      aria-label={t("goBack")}
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
  );
}
