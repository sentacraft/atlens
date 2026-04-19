"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCompareUrl } from "@/hooks/useCompareUrl";
import { Popover } from "@base-ui/react/popover";
import LensSearchDialog from "@/components/LensSearchDialog";
import { MAX_COMPARE } from "@/lib/lens";
import type { Lens } from "@/lib/types";

interface Props {
  lenses: Lens[];
  triggerClassName?: string;
}

export default function CompareAddLensButton({ lenses, triggerClassName }: Props) {
  const t = useTranslations("Compare");
  const router = useRouter();
  const { buildCompareUrl } = useCompareUrl();

  const canAddMore = lenses.length < MAX_COMPARE;
  const currentIds = lenses.map((l) => l.id);

  const handleSelectLens = useCallback(
    (lens: Lens) => {
      if (currentIds.includes(lens.id) || currentIds.length >= MAX_COMPARE) return;
      const nextIds = [...currentIds, lens.id];
      router.replace(buildCompareUrl(nextIds));
    },
    [currentIds, router, buildCompareUrl]
  );

  const getResultState = useCallback(
    (candidate: Lens) => ({
      actionLabel: currentIds.includes(candidate.id)
        ? t("alreadyAdded")
        : currentIds.length >= MAX_COMPARE
          ? t("compareFull")
          : t("addToCompareAction"),
      disabled:
        currentIds.includes(candidate.id) ||
        currentIds.length >= MAX_COMPARE,
    }),
    [currentIds, t]
  );

  const [hintOpen, setHintOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 1.5 s; clear timer on unmount
  useEffect(() => {
    if (hintOpen) {
      timerRef.current = setTimeout(() => setHintOpen(false), 1500);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hintOpen]);

  const btnClass =
    triggerClassName ??
    "h-9 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors";

  if (!canAddMore) {
    return (
      <Popover.Root open={hintOpen} onOpenChange={setHintOpen}>
        <Popover.Trigger
          className={`${btnClass} border-zinc-200 bg-white text-zinc-400 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600`}
        >
          {t("addLens")}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={8}>
            <Popover.Popup className="max-w-[220px] origin-(--transform-origin) rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 shadow-md duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {t("compareFullHint")}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <LensSearchDialog
      onSelectLens={handleSelectLens}
      getResultState={getResultState}
      triggerVariant="button"
      triggerLabel={t("addLens")}
      triggerClassName={`${btnClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900`}
    />
  );
}
