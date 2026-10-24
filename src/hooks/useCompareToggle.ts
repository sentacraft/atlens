"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCompare } from "@/context/CompareProvider";
import { useRouter } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { track } from "@/lib/analytics/analytics";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { mountSeoLabel } from "@/lib/mount";
import type { Lens } from "@/lib/types";
import { buildComparePath } from "@/lib/url/compare";
import type { CompareControl } from "@/components/lens/LensActions";

/**
 * One lens's place in its own mount's compare list. A lens from the other mount (on Iris or the
 * favorites page) goes to that mount's list, which the compare bar does not show, so adding it says so.
 */
export function useCompareToggle(lens: Pick<Lens, "id" | "mount">): CompareControl {
  const tList = useTranslations("LensList");
  const router = useRouter();
  const { slots, toggleIn } = useCompare();
  const pageMount = useEffectiveMount();
  const slot = slots[lens.mount];
  const selected = slot.includes(lens.id);
  return {
    selected,
    full: !selected && slot.length >= MAX_COMPARE,
    onToggle: () => {
      toggleIn(lens.mount, lens.id);
      if (selected || lens.mount === pageMount) {
        return;
      }
      // The provider tracks additions to the page's own mount only.
      track("compare_add", { lens_slug: lens.id });
      toast(tList("addedToMountCompare", { mount: mountSeoLabel(lens.mount) }), {
        action: {
          label: tList("viewCompare"),
          onClick: () => router.push(buildComparePath(lens.mount, [...slot, lens.id])),
        },
      });
    },
  };
}
