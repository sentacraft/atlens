"use client";

import { memo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { mountToUrlSegment } from "@/lib/mount";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { ACTION_PRIMARY_CLS, CARD_SELECTED_BORDER_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import type { Lens } from "@/lib/types";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens/image";
import { useUiHookAttr } from "@/context/TestHookProvider";
import * as fmt from "@/lib/lens/format";
import LensCardPrice from "@/components/price/LensCardPrice";

interface Props {
  lens: Lens;
  isSelected: boolean;
  selectionDisabled: boolean;
  onToggle: (id: string) => void;
  priority?: boolean;
}

// Mouse users see the star on hover; touch has no hover, so it stays visible there.
const FAVORITE_REVEAL_CLS =
  "pointer-fine:xs:opacity-0 pointer-fine:xs:group-hover:opacity-100 pointer-fine:xs:group-focus-within:opacity-100";

export default memo(function LensCard({
  lens,
  isSelected,
  selectionDisabled,
  onToggle,
  priority = false,
}: Props) {
  const t = useTranslations("LensList");
  const tActions = useTranslations("LensActions");
  const favorites = useFavorites();
  const favorited = favorites.isFavorite(lens.id);
  const tBrand = useTranslations("Brands");
  const hookAttr = useUiHookAttr();
  const equivDisplay = fmt.focalRangeDisplay(fmt.focalEquiv(lens.focalLengthMin, lens.mount), fmt.focalEquiv(lens.focalLengthMax, lens.mount));
  const mfdDisplay = lens.minFocusDistance ? `${lens.minFocusDistance.normal.cm}cm` : "—";
  const filterDisplay = fmt.filterSizeDisplay(lens.filterMm);
  const weightDisplay = fmt.weightDisplay(lens.weightG, "g") ?? "—";
  const badges = [
    lens.af
      ? {
          label: "AF",
          description: t("featureAutofocusDesc"),
          icon: FEATURE_ICONS.af,
        }
      : null,
    lens.ois
      ? {
          label: "OIS",
          description: t("featureOisDesc"),
          icon: FEATURE_ICONS.ois,
        }
      : null,
    lens.wr
      ? {
          label: "WR",
          description: t("featureWrDesc"),
          icon: FEATURE_ICONS.wr,
        }
      : null,
    lens.apertureRing
      ? {
          label: t("badgeRing"),
          description: t("featureApertureRingDesc"),
          icon: FEATURE_ICONS.apertureRing,
        }
      : null,
  ].filter((badge) => badge !== null);

  return (
    <div
      {...hookAttr("card")}
      className={`group relative rounded-2xl border bg-white dark:bg-zinc-900 flex flex-col overflow-hidden transition-[border-color,box-shadow,background-color] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        isSelected
          ? CARD_SELECTED_BORDER_CLS
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <Link
        href={`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`}
        prefetch={false}
        className="flex-1 flex flex-col max-xs:flex-row after:absolute after:inset-0 after:content-['']"
      >
        <div
          {...hookAttr("cardMedia")}
          className="relative aspect-[3/2] overflow-hidden border-b border-zinc-100/80 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-900/40 max-xs:aspect-auto max-xs:w-[145px] max-xs:shrink-0 max-xs:self-stretch max-xs:border-b-0 max-xs:border-r"
        >
          <div
            {...hookAttr("cardMediaInner")}
            className="absolute inset-0 p-3 sm:p-5 max-xs:p-2"
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <Image
                src={getLensImageUrl(lens.id)}
                alt={lens.model}
                fill
                sizes="(max-width: 499px) 129px, (max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                style={lensImageStyle}
                className="object-contain"
                // Next 16's `priority` only adds a preload link, so loading is set directly.
                loading={priority ? "eager" : "lazy"}
              />
            </div>
          </div>
        </div>

        <div
          {...hookAttr("cardBody")}
          className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4 max-xs:min-w-0"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 max-xs:pr-7">
              <p className="min-w-0 truncate text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                {fmt.lensSubtitleLine(tBrand(lens.brand), lens.series)}
              </p>
              {lens.releaseYear ? (
                <p className="hidden sm:block shrink-0 text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  {lens.releaseYear}
                </p>
              ) : null}
            </div>
            {lens.releaseYear ? (
              <p className="sm:hidden text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                {lens.releaseYear}
              </p>
            ) : null}
            <h3
              className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 leading-snug line-clamp-2 min-h-[2.5rem]"
              title={lens.model}
            >
              {lens.model}
            </h3>
          </div>

          <div className="flex min-h-[20px] flex-wrap items-center gap-1">
            {badges.map((badge) => (
              <Badge
                key={badge.label}
                label={badge.label}
                description={badge.description}
                icon={<badge.icon className="h-3 w-3" />}
              />
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">

            <dl className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:hidden">
              <div className="min-w-0 truncate">
                {equivDisplay} {t("equivSuffix")}
              </div>
              <div className="shrink-0">{weightDisplay}</div>
            </dl>

            <dl className="hidden border-t border-zinc-100 pt-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:grid sm:grid-cols-2 sm:gap-x-3">
              <div className="truncate">MFD {mfdDisplay}</div>
              <div className="text-right">⌀{filterDisplay}</div>
              <div className="min-w-0 truncate">
                {equivDisplay} {t("equivSuffix")}
              </div>
              <div className="text-right">{weightDisplay}</div>
            </dl>

            <div className="flex min-h-8 items-center pr-24">
              <LensCardPrice lens={lens} />
            </div>
          </div>
        </div>
      </Link>

      {favorites.enabled && (
        <button
          type="button"
          onClick={() => favorites.toggle(lens.id)}
          aria-label={favorited ? tActions("unfavorite") : tActions("favorite")}
          aria-pressed={favorited}
          className={cn(
            "absolute top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-[opacity,background-color,color]",
            "max-xs:top-1.5 max-xs:right-1.5 max-xs:h-9 max-xs:w-9 max-xs:border-0 max-xs:bg-transparent max-xs:shadow-none max-xs:backdrop-blur-none dark:max-xs:bg-transparent",
            FROSTED_OVERLAY_CHROME_CLS,
            favorited
              ? "text-zinc-900 dark:text-zinc-50"
              : cn("text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 max-xs:text-zinc-500", FAVORITE_REVEAL_CLS),
          )}
        >
          <Star className="h-4 w-4" fill={favorited ? "currentColor" : "none"} />
        </button>
      )}

      <button
        type="button"
        onClick={selectionDisabled ? () => toast(t("compareFullToast")) : () => onToggle(lens.id)}
        aria-label={isSelected ? t("removeFromCompare") : selectionDisabled ? t("compareFull") : t("addToCompare")}
        aria-pressed={isSelected}
        className={cn(
          "absolute right-3 bottom-3 z-10 inline-flex h-8 items-center gap-1 rounded-full border pr-3 pl-2.5 text-xs font-medium transition-colors sm:right-4 sm:bottom-4",
          isSelected
            ? cn(ACTION_PRIMARY_CLS, "border-transparent")
            : selectionDisabled
              ? "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
        )}
      >
        {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-3.5 w-3.5" />}
        {isSelected ? t("compared") : t("compareShort")}
      </button>
    </div>
  );
});

function Badge({
  label,
  description,
  icon,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <span
      title={description}
      aria-label={description}
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
    >
      {icon}
      {label}
    </span>
  );
}
