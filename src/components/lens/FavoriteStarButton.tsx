"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";

// Mouse users see the star on hover; touch has no hover, so it stays visible there.
const REVEAL_CLS =
  "pointer-fine:xs:opacity-0 pointer-fine:xs:group-hover:opacity-100 pointer-fine:xs:group-focus-within:opacity-100";

/** The star overlaid on a lens card. The caller positions it inside a `group relative` card. */
export default function FavoriteStarButton({ lensId, className }: { lensId: string; className: string }) {
  const t = useTranslations("LensActions");
  const favorites = useFavorites();
  if (!favorites.enabled) {
    return null;
  }
  const favorited = favorites.isFavorite(lensId);

  return (
    <button
      type="button"
      onClick={() => favorites.toggle(lensId)}
      aria-label={favorited ? t("unfavorite") : t("favorite")}
      aria-pressed={favorited}
      className={cn(
        "z-10 flex h-8 w-8 items-center justify-center rounded-full transition-[opacity,background-color,color]",
        FROSTED_OVERLAY_CHROME_CLS,
        favorited
          ? "text-zinc-900 dark:text-zinc-50"
          : cn("text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50", REVEAL_CLS),
        className,
      )}
    >
      <Star className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
