"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Check, Plus, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ChartLensFacts } from "@/components/charts/ChartLensCard";
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { ACTION_PRIMARY_CLS, COMPARE_CHIP_CLS, COMPARE_CHIP_STATE_CLS } from "@/config/ui-tokens";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import { useFavorites } from "@/hooks/useFavorites";
import type { ChartLens } from "@/lib/charts/catalog";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { lensPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

/** What a tap on a chart's lens opens: its details, favorite and compare, and a link to its page. */
export default function ChartLensSheet({
  lens,
  open,
  onOpenChange,
}: {
  lens: ChartLens | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-sm">{lens && <SheetBody lens={lens} />}</DialogPopup>
    </Dialog>
  );
}

function SheetBody({ lens }: { lens: ChartLens }) {
  const t = useTranslations("Charts");
  const tActions = useTranslations("LensActions");
  const tBrand = useTranslations("Brands");
  const compare = useCompareToggle(lens.id);
  const favorites = useFavorites();
  const favorited = favorites.isFavorite(lens.id);

  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-2">
      <div className="flex items-center gap-3.5">
        <Image src={getLensImageUrl(lens.id)} alt="" width={88} height={88} className="size-22 shrink-0 object-contain" style={lensImageStyle} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{brandLabel(tBrand, lens.brand)}</span>
          <DialogTitle className="text-base font-semibold leading-snug text-zinc-900">{lens.model}</DialogTitle>
          <ChartLensFacts lens={lens} className="text-[13px]" />
        </div>
      </div>
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => favorites.toggle(lens.id)}
          aria-pressed={favorited}
          className={cn(COMPARE_CHIP_CLS, COMPARE_CHIP_STATE_CLS.idle, "h-11 flex-1 justify-center gap-1.5 text-sm", favorited && "border-zinc-900 text-zinc-900")}
        >
          <Star className="size-4" fill={favorited ? "currentColor" : "none"} aria-hidden="true" />
          {favorited ? tActions("favorited") : tActions("favorite")}
        </button>
        <button
          type="button"
          onClick={compare.onToggle}
          aria-pressed={compare.selected}
          className={cn(COMPARE_CHIP_CLS, compare.stateCls, "h-11 flex-1 justify-center gap-1.5 text-sm")}
        >
          {compare.selected ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {compare.label}
        </button>
      </div>
      <Link href={lensPath(lens)} className={cn(ACTION_PRIMARY_CLS, "flex h-11 items-center justify-center rounded-lg text-sm font-medium")}>
        {t("viewDetails")}
      </Link>
    </div>
  );
}
