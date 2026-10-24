"use client";

import { useTranslations } from "next-intl";
import { Backpack, Check } from "lucide-react";
import LensActions from "@/components/lens/LensActions";
import { RetailersDropdown } from "@/components/price/RetailersDropdown";
import { PANEL_ACTION_CLS } from "@/config/ui-tokens";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import { useOwnedLens } from "@/hooks/useOwnedLens";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The lens page's actions: favorite and compare, then where to buy and owning it, two by two. */
export default function LensDetailActions({ lens }: { lens: Lens }) {
  const t = useTranslations("LensActions");
  const compare = useCompareToggle(lens);
  const ownership = useOwnedLens(lens.id);
  return (
    <div data-testid="lens-detail-actions" className="@container flex flex-col gap-2">
      <LensActions lensId={lens.id} lensName={lens.model} compare={compare} tier="panel" />
      <div className="flex gap-2">
        <RetailersDropdown lens={lens} customId="detail" />
        <button
          type="button"
          onClick={ownership.toggle}
          disabled={ownership.pending}
          aria-pressed={ownership.owned}
          title={ownership.owned ? t("removeOwned") : undefined}
          className={cn(PANEL_ACTION_CLS, "disabled:opacity-60", ownership.owned && "text-zinc-900")}
        >
          {ownership.owned ? <Check className="size-4" strokeWidth={2.5} aria-hidden="true" /> : <Backpack className="size-4" aria-hidden="true" />}
          {ownership.owned ? t("owned") : t("own")}
        </button>
      </div>
    </div>
  );
}
