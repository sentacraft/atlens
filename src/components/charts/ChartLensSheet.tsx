"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChartLensSummary } from "@/components/charts/ChartLensCard";
import LensActions from "@/components/lens/LensActions";
import { Dialog, DialogPopup } from "@/components/ui/dialog";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import type { ChartLens } from "@/lib/charts/catalog";
import { brandLabel } from "@/lib/lens/format";
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
  const tBrand = useTranslations("Brands");
  const compare = useCompareToggle(lens);

  return (
    <div className="flex flex-col gap-4 px-5 pb-5 pt-2">
      <ChartLensSummary lens={lens} size="sheet" />
      <LensActions lensId={lens.id} lensName={`${brandLabel(tBrand, lens.brand)} ${lens.model}`} compare={compare} tier="panel" />
      <Link href={lensPath(lens)} className={cn(ACTION_PRIMARY_CLS, "flex h-11 items-center justify-center rounded-lg text-sm font-medium")}>
        {t("viewDetails")}
      </Link>
    </div>
  );
}
