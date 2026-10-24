"use client";

import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
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
          <button type="button" onClick={() => openSupport("page_end")} className={cn("group", TEXT_LINK_CLS)}>
            <Heart
              className="mr-1 inline-block size-3.5 fill-rose-500 align-[-2px] text-rose-500 transition-transform group-hover:scale-110"
              aria-hidden="true"
            />
            {chunks}
          </button>
        ),
      })}
    </p>
  );
}
