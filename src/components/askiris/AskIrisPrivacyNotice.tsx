"use client";

import { Popover } from "@base-ui/react/popover";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Z } from "@/config/ui";
import { DISCLOSURE_LINK_CLS, POPUP_SURFACE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export default function AskIrisPrivacyNotice() {
  const t = useTranslations("AskIris");

  return (
    <Popover.Root>
      <Popover.Trigger
        data-testid="askiris-privacy-trigger"
        className={DISCLOSURE_LINK_CLS}
      >
        {t("privacyNoticeTrigger")}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={8} className={Z.overlay}>
          <Popover.Popup
            className={cn(
              "w-[min(22rem,calc(100vw-2rem))] origin-(--transform-origin) p-4 text-left text-xs leading-relaxed text-zinc-700 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:text-zinc-300",
              POPUP_SURFACE_CLS,
            )}
          >
            <p>{t("privacyNoticeBody")}</p>
            <Link
              href="/about#privacy"
              className="mt-2 inline-flex font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              {t("privacyNoticeLink")}
            </Link>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
