"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import SupportPanel from "@/components/support/SupportPanel";
import { ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { track } from "@/lib/analytics/analytics";
import type { SupportEntry } from "@/lib/support";
import { cn } from "@/lib/utils";

type OpenSupport = (entry: SupportEntry) => void;

const SupportDialogContext = createContext<OpenSupport>(() => {});

export function SupportDialogProvider({ lensCount, children }: { lensCount: number; children: React.ReactNode }) {
  const t = useTranslations("Support");
  const [open, setOpen] = useState(false);
  const openSupport = useMemo<OpenSupport>(
    () => (entry) => {
      track("support_open", { entry });
      setOpen(true);
    },
    [],
  );
  return (
    <SupportDialogContext value={openSupport}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-md">
          <DialogHeader className="flex-row items-start justify-between gap-3 pr-5">
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogClose aria-label={t("close")} className={cn(ICON_CLOSE_BTN_CLS, "hidden h-9 w-9 sm:inline-flex")}>
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <SupportBody lensCount={lensCount} />
        </DialogPopup>
      </Dialog>
    </SupportDialogContext>
  );
}

/** On a short screen the panel scrolls; a fade at the bottom shows there is more below. */
function SupportBody({ lensCount }: { lensCount: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollDown } = useScrollAffordance(scrollRef);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 overflow-y-auto px-5 pb-5">
        <SupportPanel lensCount={lensCount} />
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent transition-opacity duration-200",
          canScrollDown ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function useSupportDialog(): OpenSupport {
  return useContext(SupportDialogContext);
}
