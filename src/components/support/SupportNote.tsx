"use client";

import { useTranslations } from "next-intl";
import { useSupportDialog } from "@/context/SupportDialogProvider";
import { TEXT_LINK_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

/** The quiet line that closes a lens, collection or compare page. */
export default function SupportNote({ className }: { className?: string }) {
  const t = useTranslations("Support");
  const openSupport = useSupportDialog();
  return (
    <p className={cn("text-center text-xs leading-relaxed text-zinc-500", className)}>
      {t.rich("pageEnd", {
        support: (chunks) => (
          <button type="button" onClick={() => openSupport("page_end")} className={TEXT_LINK_CLS}>
            {chunks}
          </button>
        ),
      })}
    </p>
  );
}
