"use client";

import { memo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { mountToUrlSegment } from "@/lib/mount";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { ACTION_PRIMARY_CLS, CARD_SELECTED_BORDER_CLS } from "@/config/ui-tokens";
import type { Lens } from "@/lib/types";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens-image";
import { useUiHookAttr } from "@/context/TestHookProvider";
import * as fmt from "@/lib/lens.format";
import { Button } from "@/components/ui/button";
import LensCardPrice from "./LensCardPrice";

interface Props {
  lens: Lens;
  isSelected: boolean;
  selectionDisabled: boolean;
  onToggle: (id: string) => void;
  priority?: boolean;
  hideCompare?: boolean;
}

export default memo(function LensCard({
  lens,
  isSelected,
  selectionDisabled,
  onToggle,
  priority = false,
  hideCompare = false,
}: Props) {
  const t = useTranslations("LensList");
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
      className={`rounded-2xl border bg-white dark:bg-zinc-900 flex flex-col overflow-hidden transition-[border-color,box-shadow] max-xs:relative ${
        isSelected
          ? CARD_SELECTED_BORDER_CLS
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Clickable detail area */}
      <Link
        href={`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`}
        prefetch={false}
        className="flex-1 flex flex-col hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors max-xs:flex-row"
      >
        <div
          {...hookAttr("cardMedia")}
          className="relative aspect-[3/2] overflow-hidden border-b border-zinc-100/80 bg-zinc-50/40 sm:aspect-[5/4] dark:border-zinc-800 dark:bg-zinc-900/40 max-xs:aspect-auto max-xs:w-[132px] max-xs:shrink-0 max-xs:self-stretch max-xs:border-b-0 max-xs:border-r"
        >
          <div
            {...hookAttr("cardMediaInner")}
            className="absolute inset-0 p-3 sm:p-7 max-xs:p-2"
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl">
              <Image
                src={getLensImageUrl(lens.id)}
                alt={lens.model}
                fill
                sizes="(max-width: 499px) 112px, (max-width: 640px) 50vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                style={lensImageStyle}
                className="object-contain"
                priority={priority}
                loading={priority ? undefined : "lazy"}
              />
            </div>
          </div>
        </div>

        <div
          {...hookAttr("cardBody")}
          className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4 max-xs:min-w-0"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 max-xs:pr-9">
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

          {/* Feature badges with the reference price pinned to the row's right
              edge — price shares this line instead of taking its own. Badges
              flex-wrap in the flexible left column; price is shrink-0 so it
              never wraps, and the row grows downward if badges need a 2nd line. */}
          <div className="flex min-h-[20px] items-start justify-between gap-1">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {badges.map((badge) => (
                <Badge
                  key={badge.label}
                  label={badge.label}
                  description={badge.description}
                  icon={<badge.icon className="h-3 w-3" />}
                />
              ))}
            </div>
            {/* Price rides the badge row on wider cards; on the narrow
                horizontal card it drops to its own line below, where the badge
                row has no room to spare without stacking badges vertically. */}
            <div className="hidden shrink-0 xs:block">
              <LensCardPrice lens={lens} />
            </div>
          </div>

          {/* Specs (and, on the narrow card, the price) pinned to the bottom. */}
          <div className="mt-auto flex flex-col gap-2">
            <div className="xs:hidden">
              <LensCardPrice lens={lens} />
            </div>

            {/* Mobile: single-row dl */}
            <dl className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:hidden">
              <div className="min-w-0 truncate">
                {equivDisplay} {t("equivSuffix")}
              </div>
              <div className="shrink-0">{weightDisplay}</div>
            </dl>

            {/* Desktop: 2×2 data grid */}
            <dl className="hidden border-t border-zinc-100 pt-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:grid sm:grid-cols-2 sm:gap-x-3">
              <div className="truncate">MFD {mfdDisplay}</div>
              <div className="text-right">⌀{filterDisplay}</div>
              <div className="min-w-0 truncate">
                {equivDisplay} {t("equivSuffix")}
              </div>
              <div className="text-right">{weightDisplay}</div>
            </dl>
          </div>
        </div>
      </Link>

      {/* Mobile-only icon compare toggle — absolute in top-right corner */}
      {!hideCompare && (
        <button
          onClick={selectionDisabled ? () => toast(t("compareFullToast")) : () => onToggle(lens.id)}
          aria-label={isSelected ? t("removeFromCompare") : selectionDisabled ? t("compareFull") : t("addToCompare")}
          className={`hidden max-xs:flex absolute top-2 right-2 z-10 items-center justify-center h-8 w-8 rounded-full transition-colors ${
            isSelected
              ? ACTION_PRIMARY_CLS
              : selectionDisabled
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      )}

      {/* Compare toggle */}
      {!hideCompare && (
        <div
          {...hookAttr("cardFooter")}
          className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4 max-xs:hidden"
        >
          <Button
            size="sm"
            onClick={() => onToggle(lens.id)}
            disabled={selectionDisabled}
            className={`w-full h-10 sm:h-9 font-medium ${
              isSelected
                ? `text-xs ${ACTION_PRIMARY_CLS}`
                : selectionDisabled
                  ? "text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  : "text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {isSelected ? t("removeFromCompare") : selectionDisabled ? t("compareFull") : t("addToCompare")}
          </Button>
        </div>
      )}
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
