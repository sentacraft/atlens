"use client";

import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ChartLensSummary } from "@/components/charts/ChartLensCard";
import FavoriteStarButton from "@/components/lens/FavoriteStarButton";
import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { ACTION_PRIMARY_CLS, COMPARE_CHIP_CLS } from "@/config/ui-tokens";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import type { ChartLens } from "@/lib/charts/catalog";
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
  const compare = useCompareToggle(lens.id);

  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-2">
      <ChartLensSummary lens={lens} size="sheet" />
      <div className="flex gap-2.5">
        <FavoriteStarButton lensId={lens.id} placement="inline" className="h-11 w-11" />
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
