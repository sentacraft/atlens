"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUpRight, Share, Star } from "lucide-react";
import { Tabs } from "@base-ui/react/tabs";
import { ACTION_OUTLINE_CLS, ACTION_PRIMARY_CLS, SEGMENTED_LIST_CLS, SEGMENTED_TAB_CLS } from "@/config/ui-tokens";
import { SITE } from "@/config/site";
import { track } from "@/lib/analytics/analytics";
import { donationChannels, KOFI_URL, WECHAT_QR_SRC, type DonationChannel } from "@/lib/support";
import { cn } from "@/lib/utils";

// Both panels share one height so switching tabs does not move the rest of the dialog.
const CHANNEL_PANEL_CLS = "flex min-h-64 flex-col items-center justify-center gap-4 text-center outline-none";
const HELP_BTN_CLS = cn(ACTION_OUTLINE_CLS, "h-9 px-3 text-[13px] max-sm:h-11 max-sm:flex-1 max-sm:justify-center");

function KofiMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"
        fill="#FF5E5B"
      />
    </svg>
  );
}

function KofiPanel() {
  const t = useTranslations("Support");
  return (
    <>
      <KofiMark />
      <p className="text-sm text-zinc-500">{t("kofiBody")}</p>
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(ACTION_PRIMARY_CLS, "inline-flex h-10 items-center gap-1.5 rounded-lg px-5 text-sm font-medium")}
      >
        {t("kofiButton")}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </a>
    </>
  );
}

function WechatPanel() {
  const t = useTranslations("Support");
  return (
    <a href={WECHAT_QR_SRC} target="_blank" rel="noopener" aria-label={t("wechatEnlarge")} className="block w-60">
      <Image
        src={WECHAT_QR_SRC}
        alt={t("wechatQrAlt")}
        width={1152}
        height={1152}
        sizes="240px"
        className="h-auto w-full rounded-lg"
      />
    </a>
  );
}

const CHANNEL_PANELS: Record<DonationChannel, () => React.ReactNode> = {
  kofi: KofiPanel,
  wechat: WechatPanel,
};

async function shareSite(url: string, text: string, copiedLabel: string) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ url, text });
      track("share_action", { method: "site_link" });
    } catch {
      // Cancelling the share sheet rejects; nothing to report.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(copiedLabel);
    track("share_action", { method: "site_link" });
  } catch {
    toast(url);
  }
}

/** The ways to support Atlens: a tab per tipping channel, this locale's usual one first and open, then free ways to help. */
export default function SupportPanel({ lensCount, className }: { lensCount: number; className?: string }) {
  const t = useTranslations("Support");
  const locale = useLocale();
  const channels = donationChannels(locale);
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-sm leading-relaxed text-zinc-500">{t("body", { count: lensCount })}</p>
      <Tabs.Root defaultValue={channels[0]}>
        <Tabs.List className={SEGMENTED_LIST_CLS}>
          {channels.map((channel) => (
            <Tabs.Tab key={channel} value={channel} className={SEGMENTED_TAB_CLS}>
              {channel === "wechat" ? t("wechatTitle") : "Ko-fi"}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {channels.map((channel) => {
          const Panel = CHANNEL_PANELS[channel];
          return (
            <Tabs.Panel key={channel} value={channel} className={CHANNEL_PANEL_CLS}>
              <Panel />
            </Tabs.Panel>
          );
        })}
      </Tabs.Root>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-zinc-500">{t("otherWays")}</span>
        <div className="flex gap-2">
          <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer" className={HELP_BTN_CLS}>
            <Star className="size-3.5" aria-hidden="true" />
            {t("star")}
          </a>
          <button
            type="button"
            onClick={() => shareSite(`${SITE.url}/${locale}`, t("shareText"), t("linkCopied"))}
            className={HELP_BTN_CLS}
          >
            <Share className="size-3.5" aria-hidden="true" />
            {t("share")}
          </button>
        </div>
      </div>
    </div>
  );
}
