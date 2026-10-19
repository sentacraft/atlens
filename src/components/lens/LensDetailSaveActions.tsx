"use client";

import { useTranslations } from "next-intl";
import { Backpack, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { useOwnedLens } from "@/hooks/useOwnedLens";

const TOGGLE_CLS =
  "inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-zinc-100 disabled:opacity-60";
const TOGGLE_IDLE_CLS = "text-zinc-600 hover:text-zinc-900";
const TOGGLE_ON_CLS = "text-zinc-900";

export default function LensDetailSaveActions({ lensId }: { lensId: string }) {
  const t = useTranslations("LensActions");
  const favorites = useFavorites();
  const ownership = useOwnedLens(lensId);
  const favorited = favorites.isFavorite(lensId);

  return (
    <div className="flex items-center gap-0.5">
      <span aria-hidden="true" className="mr-1.5 ml-0.5 h-4 w-px bg-zinc-200 max-sm:hidden" />
      <button
        type="button"
        onClick={() => favorites.toggle(lensId)}
        aria-pressed={favorited}
        className={cn(TOGGLE_CLS, favorited ? TOGGLE_ON_CLS : TOGGLE_IDLE_CLS)}
      >
        <Star className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
        {favorited ? t("favorited") : t("favorite")}
      </button>
      <button
        type="button"
        onClick={ownership.toggle}
        disabled={ownership.pending}
        aria-pressed={ownership.owned}
        title={ownership.owned ? t("removeOwned") : undefined}
        className={cn(TOGGLE_CLS, ownership.owned ? TOGGLE_ON_CLS : TOGGLE_IDLE_CLS)}
      >
        {ownership.owned ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Backpack className="h-4 w-4" />}
        {ownership.owned ? t("owned") : t("own")}
      </button>
    </div>
  );
}
