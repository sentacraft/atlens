"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { COMPARE_CHIP_STATE_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";

// Mouse users see the star on hover; touch has no hover, so it stays visible there.
const REVEAL_CLS =
  "pointer-fine:xs:opacity-0 pointer-fine:xs:group-hover:opacity-100 pointer-fine:xs:group-focus-within:opacity-100";

/**
 * The favorite star. `overlay` sits on a lens card's image, inside a `group relative` card the caller
 * positions it in; `inline` sits in a row beside the compare chip and is always shown.
 */
export default function FavoriteStarButton({
  lensId,
  placement,
  className,
}: {
  lensId: string;
  placement: "overlay" | "inline";
  className?: string;
}) {
  const t = useTranslations("LensActions");
  const favorites = useFavorites();
  const favorited = favorites.isFavorite(lensId);

  return (
    <button
      type="button"
      onClick={() => favorites.toggle(lensId)}
      aria-label={favorited ? t("unfavorite") : t("favorite")}
      title={favorited ? t("unfavorite") : t("favorite")}
      aria-pressed={favorited}
      className={cn(
        "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[opacity,background-color,color]",
        placement === "overlay"
          ? cn(FROSTED_OVERLAY_CHROME_CLS, favorited ? "text-zinc-900" : cn("text-zinc-600 hover:text-zinc-900", REVEAL_CLS))
          : cn("border", COMPARE_CHIP_STATE_CLS.idle, favorited && "text-zinc-900"),
        className,
      )}
    >
      <Star className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
