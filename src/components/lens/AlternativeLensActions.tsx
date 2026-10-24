"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCompare } from "@/context/CompareProvider";
import LensActions from "@/components/lens/LensActions";
import { track } from "@/lib/analytics/analytics";
import { planAlternativeCompare } from "@/lib/lens/alternatives";
import { MAX_COMPARE } from "@/lib/lens/lens";

/** Favorite and compare for a same-focal alternative, where compare adds it together with the lens on the page. */
export default function AlternativeLensActions({
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
  const tCompare = useTranslations("Compare");
  const { compareIds, add, remove, seed } = useCompare();
  const step = planAlternativeCompare(compareIds, currentId, lensId, MAX_COMPARE);

  const onToggle = () => {
    switch (step.kind) {
      case "remove":
        remove(lensId);
        return;
      case "add":
        add(lensId);
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
    <LensActions
      lensId={lensId}
      lensName={lensName}
      compare={{ selected: compareIds.includes(lensId), full: step.kind === "full", onToggle, hint: t("compareWithCurrent") }}
      tier="row"
      className={className}
    />
  );
}
