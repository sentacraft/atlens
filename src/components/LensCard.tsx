"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Aperture, Plus, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { ACTION_PRIMARY_CLS, CARD_SELECTED_BORDER_CLS } from "@/lib/ui-tokens";
import type { Lens } from "@/lib/types";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens-image";
import { useUiHookAttr } from "@/context/TestHookProvider";
import * as fmt from "@/lib/lens.format";
import { Button } from "@/components/ui/button";

interface Props {
  lens: Lens;
  isSelected: boolean;
  selectionDisabled: boolean;
  onToggle: () => void;
  priority?: boolean;
}

export default function LensCard({
  lens,
  isSelected,
  selectionDisabled,
  onToggle,
  priority = false,
}: Props) {
  const t = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const hookAttr = useUiHookAttr();
  const equivDisplay = fmt.focalRangeDisplay(fmt.focalEquiv(lens.focalLengthMin), fmt.focalEquiv(lens.focalLengthMax));
  const mfdDisplay = lens.minFocusDistance ? `${lens.minFocusDistance.cm}cm` : "—";
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
      className={`rounded-2xl border bg-white dark:bg-zinc-900 flex flex-col overflow-hidden transition-[border-color,box-shadow] max-[499px]:relative ${
        isSelected
          ? CARD_SELECTED_BORDER_CLS
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Clickable detail area */}
      <Link
        href={`/lenses/${lens.id}`}
        className="flex-1 flex flex-col hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors max-[499px]:flex-row"
      >
        <div
          {...hookAttr("cardMedia")}
          className="relative aspect-[3/2] overflow-hidden border-b border-zinc-100/80 bg-zinc-50/40 sm:aspect-[5/4] dark:border-zinc-800 dark:bg-zinc-900/40 max-[499px]:aspect-auto max-[499px]:w-[132px] max-[499px]:shrink-0 max-[499px]:self-stretch max-[499px]:border-b-0 max-[499px]:border-r"
        >
          <div
            {...hookAttr("cardMediaInner")}
            className="absolute inset-0 p-3 sm:p-7 max-[499px]:p-2"
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
                loading={priority ? undefined : "eager"}
              />
            </div>
          </div>
        </div>

        <div
          {...hookAttr("cardBody")}
          className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4 max-[499px]:min-w-0"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 truncate max-[499px]:pr-9">
                {tBrand(lens.brand)}
                {lens.series ? ` · ${lens.series}` : ""}
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

          <div className="flex gap-1 flex-wrap min-h-[20px]">
            {badges.map((badge) => (
              <Badge
                key={badge.label}
                label={badge.label}
                description={badge.description}
                icon={<badge.icon className="h-3 w-3" />}
              />
            ))}
          </div>

          {/* Mobile: single-row dl */}
          <dl className="mt-auto flex items-baseline justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400 sm:hidden">
            <div className="min-w-0 truncate">
              {equivDisplay} {t("equivSuffix")}
            </div>
            <div className="shrink-0">{weightDisplay}</div>
          </dl>

          {/* Desktop: 2×2 data grid */}
          <dl className="mt-auto hidden sm:grid sm:grid-cols-2 sm:gap-x-3 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="truncate">MFD {mfdDisplay}</div>
            <div className="text-right">⌀{filterDisplay}</div>
            <div className="min-w-0 truncate">
              {equivDisplay} {t("equivSuffix")}
            </div>
            <div className="text-right">{weightDisplay}</div>
          </dl>
        </div>
      </Link>

      {/* Mobile-only icon compare toggle — absolute in top-right corner */}
      <button
        onClick={onToggle}
        disabled={selectionDisabled}
        aria-label={isSelected ? t("removeFromCompare") : t("addToCompare")}
        className={`hidden max-[499px]:flex absolute top-2.5 right-2.5 z-10 items-center justify-center h-7 w-7 rounded-full transition-colors ${
          isSelected
            ? ACTION_PRIMARY_CLS
            : selectionDisabled
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </button>

      {/* Compare toggle */}
      <div
        {...hookAttr("cardFooter")}
        className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4 max-[499px]:hidden"
      >
        <Button
          size="sm"
          onClick={onToggle}
          disabled={selectionDisabled}
          className={`w-full h-10 sm:h-9 text-xs font-medium ${
            isSelected
              ? ACTION_PRIMARY_CLS
              : selectionDisabled
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
        >
          {isSelected ? t("removeFromCompare") : t("addToCompare")}
        </Button>
      </div>
    </div>
  );
}

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
