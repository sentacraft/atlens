"use client";

import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompare } from "@/context/CompareProvider";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { COMPARE_CHIP_CLS, COMPARE_CHIP_STATE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export default function CompareChipToggle({ lensId, className }: { lensId: string; className?: string }) {
  const t = useTranslations("LensList");
  const { compareIds, toggle } = useCompare();
  const selected = compareIds.includes(lensId);
  const full = !selected && compareIds.length >= MAX_COMPARE;

  return (
    <button
      type="button"
      onClick={full ? () => toast(t("compareFullToast")) : () => toggle(lensId)}
      aria-label={selected ? t("removeFromCompare") : full ? t("compareFull") : t("addToCompare")}
      aria-pressed={selected}
      className={cn(COMPARE_CHIP_CLS, "shrink-0 pr-3 pl-2.5", COMPARE_CHIP_STATE_CLS[selected ? "selected" : full ? "full" : "idle"], className)}
    >
      {selected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-3.5 w-3.5" />}
      {selected ? t("compared") : t("compareShort")}
    </button>
  );
}
