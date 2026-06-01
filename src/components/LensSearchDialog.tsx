"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { mountToUrlSegment } from "@/lib/mount";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";
import LensSearchPanel, { type LensSearchResultState } from "./LensSearchPanel";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/lib/ui-tokens";

interface LensSearchDialogProps {
  lenses: Lens[];
  onSelectLens?: (lens: Lens) => void;
  getResultState?: (lens: Lens) => LensSearchResultState | undefined;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerVariant?: "icon" | "button" | "slot";
  /** Trigger glyph for `icon` and `button` variants. Defaults to Search. */
  triggerIcon?: LucideIcon;
}

export default function LensSearchDialog({
  lenses,
  onSelectLens,
  getResultState,
  triggerClassName,
  triggerLabel,
  triggerVariant = "icon",
  triggerIcon: TriggerIcon = Search,
}: LensSearchDialogProps) {
  const t = useTranslations("Search");
  const router = useRouter();
  const mount = useEffectiveMount();
  const isDesktop = useBreakpoint("sm");
  const [open, setOpen] = useState(false);

  // On mobile the search opens a real full-screen page (normal document flow)
  // instead of a fixed overlay — that is the only layout that lets the result
  // list scroll fully above the iOS on-screen keyboard, since fixed sheets are
  // anchored to the layout viewport and stay behind the keyboard. Desktop has
  // no keyboard constraint, so it keeps the centered dialog.
  const mountSegment = mountToUrlSegment(mount);
  const searchPageHref = onSelectLens
    ? `/lenses/${mountSegment}/search?intent=compare`
    : `/lenses/${mountSegment}/search`;

  function handleTriggerClick() {
    if (isDesktop) {
      setOpen(true);
    } else {
      router.push(searchPageHref);
    }
  }

  function handleSelect(lens: Lens) {
    setOpen(false);
    if (onSelectLens) {
      onSelectLens(lens);
      return;
    }
    router.push(`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-label={triggerLabel ?? t("open")}
        className={cn(
          triggerVariant === "icon"
            ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
            : triggerVariant === "button"
              ? "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
              : "group flex w-full flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50/60 text-center text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-100/70 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
          triggerClassName
        )}
      >
        {triggerVariant === "icon" && (
          <TriggerIcon className="h-4 w-4" />
        )}
        {triggerVariant === "button" && (
          <>
            <TriggerIcon className="h-4 w-4" />
            <span>{triggerLabel ?? t("add")}</span>
          </>
        )}
        {triggerVariant === "slot" && (
          <>
            <Search className="h-6 w-6 opacity-40 transition-opacity group-hover:opacity-70" />
            <span className="text-xs font-medium">
              {triggerLabel ?? t("addLens")}
            </span>
          </>
        )}
      </button>

      {/* Desktop only — mobile navigates to the search page instead. */}
      <Dialog open={open} onOpenChange={setOpen} responsive={false}>
        <DialogContent
          className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950"
          showCloseButton={false}
        >
          <DialogHeader className="border-b border-zinc-100 pr-5 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription className="sr-only">{t("description")}</DialogDescription>
              </div>
              <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "h-9 w-9")}>
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </DialogHeader>

          {open && (
            <LensSearchPanel
              lenses={lenses}
              onSelectLens={handleSelect}
              getResultState={getResultState}
              autoFocus
              layout="container"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
