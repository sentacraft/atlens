"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Heart, X } from "lucide-react";
import { useSupportDialog } from "@/context/SupportDialogProvider";
import { ACTION_PRIMARY_CLS, ACTION_QUIET_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { Z } from "@/config/ui";
import { track } from "@/lib/analytics/analytics";
import { browserPromptStore, finishRevisitPrompt, recordVisit, revisitPromptDue } from "@/lib/support-prompts";
import { cn } from "@/lib/utils";

const SHOW_AFTER_MS = 4000;

/** A one-time card for a visitor on their third day of visits within 30 days. */
export default function RevisitPrompt() {
  const t = useTranslations("Support");
  const openSupport = useSupportDialog();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const store = browserPromptStore();
    recordVisit(store);
    if (!revisitPromptDue(store)) {
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(true);
      track("support_prompt", { prompt: "revisit", action: "shown" });
    }, SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  const finish = (action: "dismissed" | "opened") => {
    finishRevisitPrompt(browserPromptStore());
    track("support_prompt", { prompt: "revisit", action });
    setVisible(false);
    if (action === "opened") {
      openSupport("revisit");
    }
  };

  return (
    <section
      aria-labelledby="revisit-prompt-title"
      className={cn(
        "fixed flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg",
        "inset-x-3 bottom-[calc(var(--compare-bar-height,0px)+var(--safe-inset-bottom)+0.75rem)]",
        "sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-90",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none",
        Z.fixed,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 sm:inline-flex">
          <Heart className="size-4 text-zinc-900" aria-hidden="true" />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="revisit-prompt-title" className="text-sm font-semibold text-zinc-900">
            {t("revisitTitle")}
          </h2>
          <p className="text-[13px] leading-relaxed text-zinc-500">{t("revisitBody")}</p>
        </div>
        <button
          type="button"
          aria-label={t("close")}
          onClick={() => finish("dismissed")}
          className={cn(ICON_CLOSE_BTN_CLS, "-mr-2 -mt-2 size-10 sm:size-8")}
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button type="button" onClick={() => finish("dismissed")} className={cn(ACTION_QUIET_CLS, "max-sm:h-11 max-sm:border max-sm:border-zinc-200")}>
          {t("revisitLater")}
        </button>
        <button
          type="button"
          onClick={() => finish("opened")}
          className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-3.5 text-sm font-medium max-sm:h-11")}
        >
          {t("revisitSupport")}
        </button>
      </div>
    </section>
  );
}
