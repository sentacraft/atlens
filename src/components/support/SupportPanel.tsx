"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUpRight, Download, Share, Star } from "lucide-react";
import { Tabs } from "@base-ui/react/tabs";
import { ACTION_OUTLINE_CLS, ACTION_PRIMARY_CLS, SEGMENTED_LIST_CLS, SEGMENTED_TAB_CLS } from "@/config/ui-tokens";
import { SITE } from "@/config/site";
import { useIsMobileDevice, useIsWeChatBrowser } from "@/hooks/useViewport";
import { track } from "@/lib/analytics/analytics";
import { saveImage } from "@/lib/share-image";
import { donationChannels, KOFI_URL, WECHAT_QR_DISPLAY_SRC, WECHAT_QR_SRC, type DonationChannel } from "@/lib/support";
import { cn } from "@/lib/utils";

// Both panels share one height so switching tabs does not move the rest of the dialog; on a phone
// the WeChat panel carries a line of instructions below the code.
const CHANNEL_PANEL_CLS = "flex flex-col items-center justify-center gap-4 text-center outline-none";
const CHANNEL_PANEL_HEIGHT_CLS = { desktop: "min-h-64", phone: "min-h-72", wechat: "min-h-72" } as const;

/** How a WeChat code can be used here: scanned from another phone, saved and scanned from the album, or pressed in WeChat. */
type WechatMode = keyof typeof CHANNEL_PANEL_HEIGHT_CLS;

function useWechatMode(): WechatMode {
  const mobile = useIsMobileDevice();
  const wechat = useIsWeChatBrowser();
  if (!mobile) {
    return "desktop";
  }
  return wechat ? "wechat" : "phone";
}
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

function WechatPanel({ mode }: { mode: WechatMode }) {
  const t = useTranslations("Support");
  const image = (
    <Image
      // Inside WeChat the code is pressed to be recognized, so it stays the full-size JPEG there.
      src={mode === "wechat" ? WECHAT_QR_SRC : WECHAT_QR_DISPLAY_SRC}
      alt={t("wechatQrAlt")}
      width={720}
      height={720}
      sizes="240px"
      className="h-auto w-full rounded-lg"
    />
  );
  if (mode === "wechat") {
    return (
      <>
        <div className="w-58">{image}</div>
        <p className="rounded-full bg-zinc-100 px-3 py-1.5 text-[13px] leading-5 text-zinc-700">{t("wechatPressHint")}</p>
      </>
    );
  }
  const enlarge = (
    <a href={WECHAT_QR_SRC} target="_blank" rel="noopener" aria-label={t("wechatEnlarge")} className="block">
      {image}
    </a>
  );
  if (mode === "desktop") {
    return <div className="w-60">{enlarge}</div>;
  }
  return (
    <>
      <div className="relative w-58">
        {enlarge}
        <button
          type="button"
          onClick={() => saveImage(WECHAT_QR_SRC, "atlens-wechat.jpg").catch(console.error)}
          className={cn(ACTION_OUTLINE_CLS, "absolute -right-2.5 -bottom-2.5 h-8 gap-1 rounded-full px-3 text-[13px] shadow-md")}
        >
          <Download className="size-3.5" aria-hidden="true" />
          {t("wechatSave")}
        </button>
      </div>
      <p className="text-xs text-zinc-500">{t("wechatSaveHint")}</p>
    </>
  );
}

const CHANNEL_PANELS: Record<DonationChannel, (props: { mode: WechatMode }) => React.ReactNode> = {
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
export default function SupportPanel({ className }: { className?: string }) {
  const t = useTranslations("Support");
  const locale = useLocale();
  const channels = donationChannels(locale);
  const mode = useWechatMode();
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-sm leading-relaxed text-zinc-500">{t("body")}</p>
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
            <Tabs.Panel key={channel} value={channel} className={cn(CHANNEL_PANEL_CLS, CHANNEL_PANEL_HEIGHT_CLS[mode])}>
              <Panel mode={mode} />
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
