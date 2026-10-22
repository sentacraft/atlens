"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useCompare } from "@/context/CompareProvider";
import { COMPARE_CHIP_CLS, COMPARE_CHIP_STATE_CLS, POPUP_SURFACE_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { lensPath } from "@/lib/url/routes";
import type { ChartLens } from "@/lib/charts/catalog";
import { cn } from "@/lib/utils";

export default function ChartLensCard({
  lens,
  spec,
  className,
  style,
  onPointerEnter,
  onPointerLeave,
}: {
  lens: ChartLens;
  spec: string;
  className?: string;
  style?: React.CSSProperties;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const t = useTranslations("Charts");
  const tList = useTranslations("LensList");
  const tBrand = useTranslations("Brands");
  const { compareIds, toggle } = useCompare();
  const selected = compareIds.includes(lens.id);
  const full = !selected && compareIds.length >= MAX_COMPARE;

  return (
    <div
      role="dialog"
      aria-label={lens.model}
      className={cn(POPUP_SURFACE_CLS, "flex w-72 items-center gap-3 p-3", className)}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <Image
        src={getLensImageUrl(lens.id)}
        alt=""
        width={80}
        height={80}
        className="size-20 shrink-0 object-contain"
        style={lensImageStyle}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{brandLabel(tBrand, lens.brand)}</span>
        <span className="text-sm font-semibold leading-snug text-zinc-900">{lens.model}</span>
        <span className="text-xs text-zinc-600">{spec}</span>
        <div className="mt-1 flex items-center gap-3">
          <Link href={lensPath(lens)} className={cn(TEXT_LINK_CLS, "text-xs")}>
            {t("viewDetails")}
          </Link>
          <button
            type="button"
            onClick={full ? () => toast(tList("compareFullToast")) : () => toggle(lens.id)}
            aria-pressed={selected}
            className={cn(
              COMPARE_CHIP_CLS,
              "h-7 px-2.5",
              selected ? COMPARE_CHIP_STATE_CLS.selected : full ? COMPARE_CHIP_STATE_CLS.full : COMPARE_CHIP_STATE_CLS.idle,
            )}
          >
            {selected ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
            {selected ? tList("removeFromCompare") : full ? tList("compareFull") : tList("addToCompare")}
          </button>
        </div>
      </div>
    </div>
  );
}
