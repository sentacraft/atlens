"use client";

import { memo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import { ACTION_PRIMARY_CLS, CARD_SELECTED_BORDER_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import FavoriteStarButton from "@/components/lens/FavoriteStarButton";
import type { Lens } from "@/lib/types";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens/image";
import { useUiHookAttr } from "@/context/TestHookProvider";
import * as fmt from "@/lib/lens/format";
import ApproxPrice from "@/components/price/ApproxPrice";
import { lensPath } from "@/lib/url/routes";

interface Props {
  lens: Lens;
  isSelected: boolean;
  selectionDisabled: boolean;
  onToggle: (id: string) => void;
  priority?: boolean;
}

export default memo(function LensCard({
  lens,
  isSelected,
  selectionDisabled,
  onToggle,
  priority = false,
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
      className={`@container group relative rounded-2xl border bg-white flex flex-col overflow-hidden transition-[border-color,box-shadow,background-color] hover:bg-zinc-50 ${
        isSelected
          ? CARD_SELECTED_BORDER_CLS
          : "border-zinc-200"
      }`}
    >
      <Link
        href={lensPath(lens)}
        prefetch={false}
        className="flex-1 flex flex-col max-xs:flex-row after:absolute after:inset-0 after:content-['']"
      >
        <div
          {...hookAttr("cardMedia")}
          className="relative aspect-[3/2] overflow-hidden border-b border-zinc-100/80 bg-zinc-50/40 max-xs:aspect-auto max-xs:w-[145px] max-xs:shrink-0 max-xs:self-stretch max-xs:border-b-0 max-xs:border-r"
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
                sizes="(max-width: 499px) 129px, (max-width: 767px) 50vw, 284px"
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
              <p className="min-w-0 truncate text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                {fmt.lensSubtitleLine(tBrand(lens.brand), lens.series)}
              </p>
              {lens.releaseYear ? (
                <p className="hidden sm:block shrink-0 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  {lens.releaseYear}
                </p>
              ) : null}
            </div>
            {lens.releaseYear ? (
              <p className="sm:hidden text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                {lens.releaseYear}
              </p>
            ) : null}
            <h3
              className="font-semibold text-sm text-zinc-900 leading-snug line-clamp-2 min-h-[2.5rem]"
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

            <dl className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2 text-xs text-zinc-600 sm:hidden">
              <div className="min-w-0 truncate">
                {equivDisplay} {t("equivSuffix")}
              </div>
              <div className="shrink-0">{weightDisplay}</div>
            </dl>

            <dl className="hidden border-t border-zinc-100 pt-2.5 text-xs text-zinc-600 sm:grid sm:grid-cols-2 sm:gap-x-3">
              <div className="truncate">MFD {mfdDisplay}</div>
              <div className="text-right">⌀{filterDisplay}</div>
              <div className="min-w-0 truncate">
                {equivDisplay} {t("equivSuffix")}
              </div>
              <div className="text-right">{weightDisplay}</div>
            </dl>

            <div className="flex min-h-8 items-center pr-12 @min-[15rem]:pr-24">
              <ApproxPrice pricing={lens.pricing} />
            </div>
          </div>
        </div>
      </Link>

      <FavoriteStarButton
        lensId={lens.id}
        className="absolute top-2.5 right-2.5 max-xs:top-1.5 max-xs:right-1.5 max-xs:h-9 max-xs:w-9 max-xs:border-0 max-xs:bg-transparent max-xs:shadow-none max-xs:backdrop-blur-none"
      />

      <button
        type="button"
        onClick={selectionDisabled ? () => toast(t("compareFullToast")) : () => onToggle(lens.id)}
        aria-label={isSelected ? t("removeFromCompare") : selectionDisabled ? t("compareFull") : t("addToCompare")}
        aria-pressed={isSelected}
        className={cn(
          "absolute right-3 bottom-3 z-10 inline-flex h-8 items-center gap-1 rounded-full border px-2 text-xs @min-[15rem]:pr-3 @min-[15rem]:pl-2.5 font-medium transition-colors sm:right-4 sm:bottom-4",
          isSelected
            ? cn(ACTION_PRIMARY_CLS, "border-transparent")
            : selectionDisabled
              ? "border-zinc-200 bg-white text-zinc-400"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
        )}
      >
        {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-3.5 w-3.5" />}
        <span className="hidden @min-[15rem]:inline">{isSelected ? t("compared") : t("compareShort")}</span>
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
      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-500"
    >
      {icon}
      {label}
    </span>
  );
}
