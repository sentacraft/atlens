"use client";

import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompare } from "@/context/CompareProvider";
import { track } from "@/lib/analytics/analytics";
import { planAlternativeCompare } from "@/lib/lens/alternatives";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { COMPARE_CHIP_CLS, COMPARE_CHIP_STATE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export default function AlternativeCompareToggle({
  lensId,
  lensName,
  currentId,
  currentName,
  className,
}: {
  lensId: string;
  lensName: string;
  currentId: string;
  currentName: string;
  className?: string;
}) {
  const t = useTranslations("Alternatives");
  const tList = useTranslations("LensList");
  const tCompare = useTranslations("Compare");
  const { compareIds, add, remove, seed } = useCompare();
  const selected = compareIds.includes(lensId);
  const step = planAlternativeCompare(compareIds, currentId, lensId, MAX_COMPARE);
  const label = selected ? tList("removeFromCompare") : step.kind === "full" ? tList("compareFull") : tList("addToCompare");

  const onClick = () => {
    switch (step.kind) {
      case "remove":
        remove(lensId);
        return;
      case "add":
        add(lensId);
        return;
      case "full":
        toast(tList("compareFullToast"));
        return;
      case "start": {
        seed([currentId, lensId]);
        // The provider tracks single additions only, so a two-lens seed goes untracked without this.
        track("compare_add", { lens_slug: lensId });
        const names = { current: currentName, lens: lensName };
        toast(
          step.replaced.length > 0 ? t("comparisonReplaced", { ...names, count: step.replaced.length }) : t("comparisonStarted", names),
          { action: { label: tCompare("undo"), onClick: () => seed(step.replaced) } },
        );
        return;
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={selected}
      className={cn(
        COMPARE_CHIP_CLS,
        "size-8 shrink-0 justify-center",
        COMPARE_CHIP_STATE_CLS[selected ? "selected" : step.kind === "full" ? "full" : "idle"],
        className,
      )}
    >
      {selected ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-3.5 w-3.5" />}
    </button>
  );
}
