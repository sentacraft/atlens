"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Dialog, DialogClose, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import SupportPanel from "@/components/support/SupportPanel";
import { ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
import { track } from "@/lib/analytics/analytics";
import { donationChannels, WECHAT_QR_DISPLAY_SRC, type SupportEntry } from "@/lib/support";
import { cn } from "@/lib/utils";

type OpenSupport = (entry: SupportEntry) => void;

const SupportDialogContext = createContext<OpenSupport>(() => {});

export function SupportDialogProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Support");
  const [open, setOpen] = useState(false);
  usePreloadWechatCode();
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
          <SupportBody />
        </DialogPopup>
      </Dialog>
    </SupportDialogContext>
  );
}

/**
 * On a short screen the panel scrolls; a fade at the bottom shows there is more below. The scroll
 * area runs through the drawer's home-bar padding and pads its own end instead, so content slides
 * under the home bar rather than stopping short of a blank strip.
 */
function SupportBody() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollDown } = useScrollAffordance(scrollRef);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        className="-mb-[var(--safe-inset-bottom)] min-h-0 overflow-y-auto px-5 pb-[calc(1.25rem+var(--safe-inset-bottom))]"
      >
        <SupportPanel />
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-[var(--safe-inset-bottom)] h-12 bg-gradient-to-t from-white to-transparent transition-opacity duration-200",
          canScrollDown ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

export function useSupportDialog(): OpenSupport {
  return useContext(SupportDialogContext);
}

/** Fetches the WeChat code once the page is idle where the dialog opens on it, so it shows at once. */
function usePreloadWechatCode() {
  const locale = useLocale();
  const opensOnWechat = donationChannels(locale)[0] === "wechat";
  useEffect(() => {
    if (!opensOnWechat) {
      return;
    }
    const load = () => {
      new Image().src = WECHAT_QR_DISPLAY_SRC;
    };
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(load, 3000);
    return () => window.clearTimeout(id);
  }, [opensOnWechat]);
}
