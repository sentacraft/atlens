"use client";

import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Drawer } from "@base-ui/react/drawer";
import { LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { Z } from "@/config/ui";
import { trendingPresets } from "@/lib/trending";
import { PresetCard } from "@/components/CuratedComparisons";
import { ICON_NAV_BTN_CLS } from "@/lib/ui-tokens";

export default function CuratedPresetsButton() {
  const t = useTranslations("Compare");
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const trigger = (
    <span className={`${ICON_NAV_BTN_CLS} h-8 w-8`} title={t("curatedTitle")}>
      <LayoutGrid className="h-4 w-4" />
    </span>
  );

  const panelContent = (
    <div className="p-3 flex flex-col gap-2">
      <p className="px-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        {t("curatedTitle")}
      </p>
      {trendingPresets.map((preset) => (
        <PresetCard
          key={preset.slug}
          preset={preset}
          onSelect={() => setOpen(false)}
        />
      ))}
    </div>
  );

  if (!mounted) {
    return (
      <button className={`${ICON_NAV_BTN_CLS} h-8 w-8`} aria-label={t("curatedTitle")}>
        <LayoutGrid className="h-4 w-4" />
      </button>
    );
  }

  if (isDesktop) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className={`${ICON_NAV_BTN_CLS} h-8 w-8`} aria-label={t("curatedTitle")}>
          <LayoutGrid className="h-4 w-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={8}>
            <Popover.Popup className="w-96 max-h-[calc(100svh-80px)] overflow-y-auto origin-(--transform-origin) rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-zinc-900 dark:ring-zinc-800">
              {panelContent}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} swipeDirection="down">
      <Drawer.Trigger className={`${ICON_NAV_BTN_CLS} h-8 w-8`} aria-label={t("curatedTitle")}>
        <LayoutGrid className="h-4 w-4" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop className={`fixed inset-0 ${Z.overlay} bg-black/40 transition-colors duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0`} />
        <Drawer.Popup className={`fixed inset-x-0 bottom-0 ${Z.overlay} max-h-[85svh] flex flex-col rounded-t-2xl bg-white pb-[var(--safe-inset-bottom)] ring-1 ring-zinc-200 duration-200 data-open:animate-in data-open:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom dark:bg-zinc-900 dark:ring-zinc-800`}>
          <div className="flex shrink-0 touch-none justify-center pb-1 pt-3">
            <div className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </div>
          <div className="overflow-y-auto pb-8">
            {panelContent}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
