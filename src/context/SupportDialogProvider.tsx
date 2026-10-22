"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import SupportPanel from "@/components/support/SupportPanel";
import { ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
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
          <SupportPanel lensCount={lensCount} className="overflow-y-auto px-5 pb-5" />
        </DialogPopup>
      </Dialog>
    </SupportDialogContext>
  );
}

export function useSupportDialog(): OpenSupport {
  return useContext(SupportDialogContext);
}
