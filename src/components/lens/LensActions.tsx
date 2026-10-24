"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Plus, Star } from "lucide-react";
import {
  COMPARE_CHIP_CLS,
  COMPARE_CHIP_STATE_CLS,
  FROSTED_OVERLAY_CHROME_CLS,
  HOVER_REVEAL_CLS,
  PANEL_ACTION_CLS,
} from "@/config/ui-tokens";
import { useFavorites } from "@/hooks/useFavorites";
import { COMPARE_CHIP_LABEL_KEY, compareChipState } from "@/lib/lens/lens";
import { cn } from "@/lib/utils";

const ROW_IDLE_STAR_CLS =
  "border-zinc-100 bg-white text-zinc-500 group-hover:border-zinc-200 group-hover:text-zinc-700 group-focus-within:border-zinc-200 group-focus-within:text-zinc-700 hover:border-zinc-300 hover:text-zinc-900";
const ROW_IDLE_COMPARE_CLS =
  "border-zinc-100 bg-white text-zinc-500 group-hover:border-zinc-200 group-hover:text-zinc-700 group-focus-within:border-zinc-200 group-focus-within:text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50";

/** A lens's place in the compare list, from whichever source the caller keeps it in. */
export interface CompareControl {
  selected: boolean;
  full: boolean;
  onToggle: () => void;
  /** Says what the compare button does when it is more than adding this lens. */
  hint?: string;
}

/**
 * Favorite and compare for one lens, in one of three tiers chosen by how the lens is shown:
 * `panel` when it has a panel to itself (lens page, chart sheet), `row` when it is one card or row
 * among many, `dense` on a chart tile, where the buttons sit in the tile's top corners and appear
 * on hover, compare top left and favorite top right. Favorite comes first, compare second, in reading and tab order.
 */
export default function LensActions({
  lensId,
  lensName,
  compare,
  tier,
  className,
}: {
  lensId: string;
  lensName: string;
  compare: CompareControl;
  tier: "panel" | "row" | "dense";
  className?: string;
}) {
  const t = useTranslations("LensActions");
  const tList = useTranslations("LensList");
  const favorites = useFavorites();
  const favorited = favorites.isFavorite(lensId);
  const state = compareChipState(compare.selected, compare.full);
  const compareLabel = tList(COMPARE_CHIP_LABEL_KEY[state]);
  const favoriteLabel = favorited ? t("unfavorite") : t("favorite");
  const onCompare = compare.full ? () => toast(tList("compareFullToast")) : compare.onToggle;
  const star = (size: string) => <Star className={size} fill={favorited ? "currentColor" : "none"} aria-hidden="true" />;
  const compareIcon = (size: string) =>
    compare.selected ? <Check className={size} strokeWidth={2.5} aria-hidden="true" /> : <Plus className={size} aria-hidden="true" />;

  if (tier === "panel") {
    return (
      <div className={cn("grid grid-cols-2 gap-2", className)}>
        <button
          type="button"
          onClick={() => favorites.toggle(lensId)}
          aria-pressed={favorited}
          className={cn(PANEL_ACTION_CLS, favorited && "text-zinc-900")}
        >
          {star("size-4")}
          {favorited ? t("favorited") : t("favorite")}
        </button>
        <button
          type="button"
          onClick={onCompare}
          aria-pressed={compare.selected}
          aria-label={compareLabel}
          title={compare.hint}
          className={cn(PANEL_ACTION_CLS, COMPARE_CHIP_STATE_CLS[state])}
        >
          {compareIcon("size-4")}
          {compare.selected ? tList("compared") : tList("compareShort")}
        </button>
      </div>
    );
  }

  if (tier === "row") {
    // The buttons look 36px but take taps 4px beyond their edges, for a 44px target. Unselected,
    // they stay light until the pointer is on their card or row (the caller's `group`).
    return (
      <div className={cn("relative z-10 flex shrink-0 items-center gap-2", className)}>
        <button
          type="button"
          onClick={() => favorites.toggle(lensId)}
          aria-pressed={favorited}
          aria-label={`${favoriteLabel}: ${lensName}`}
          title={favoriteLabel}
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-full border transition-colors after:absolute after:-inset-1",
            favorited ? "border-zinc-200 bg-white text-zinc-900" : ROW_IDLE_STAR_CLS,
          )}
        >
          {star("size-4")}
        </button>
        <button
          type="button"
          onClick={onCompare}
          aria-pressed={compare.selected}
          aria-label={`${compareLabel}: ${lensName}`}
          title={compare.hint ?? compareLabel}
          className={cn(
            COMPARE_CHIP_CLS,
            state === "idle" ? ROW_IDLE_COMPARE_CLS : COMPARE_CHIP_STATE_CLS[state],
            "relative h-9 pr-3 pl-2.5 text-[13px] after:absolute after:-inset-1",
          )}
        >
          {compareIcon("size-3.5")}
          {compare.selected ? tList("compared") : tList("compareShort")}
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => favorites.toggle(lensId)}
        aria-pressed={favorited}
        aria-label={`${favoriteLabel}: ${lensName}`}
        title={favoriteLabel}
        className={cn(
          "absolute right-1 top-1 z-10 flex size-7 items-center justify-center rounded-full transition-[opacity,background-color,color] pointer-coarse:hidden",
          FROSTED_OVERLAY_CHROME_CLS,
          favorited ? "text-zinc-900" : cn("text-zinc-600 hover:text-zinc-900", HOVER_REVEAL_CLS),
        )}
      >
        {star("size-4")}
      </button>
      <button
        type="button"
        onClick={onCompare}
        aria-pressed={compare.selected}
        aria-label={`${compareLabel}: ${lensName}`}
        className={cn(
          "absolute left-1 top-1 z-10 inline-flex size-7 items-center justify-center rounded-full border shadow-sm transition-[opacity,background-color,color] pointer-coarse:hidden",
          COMPARE_CHIP_STATE_CLS[state],
          !compare.selected && HOVER_REVEAL_CLS,
        )}
      >
        {compareIcon("size-3.5")}
      </button>
    </>
  );
}
