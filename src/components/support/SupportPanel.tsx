"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUpRight, Share, Star } from "lucide-react";
import { ACTION_OUTLINE_CLS, ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { SITE } from "@/config/site";
import { track } from "@/lib/analytics/analytics";
import { donationChannels, KOFI_URL, WECHAT_QR_SRC, type DonationChannel } from "@/lib/support";
import { cn } from "@/lib/utils";

const CHANNEL_CARD_CLS = "flex gap-3 rounded-xl border border-zinc-200 bg-white p-4";
const HELP_BTN_CLS = cn(ACTION_OUTLINE_CLS, "h-9 px-3 text-[13px] max-sm:h-11 max-sm:flex-1 max-sm:justify-center");

function KofiMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"
        fill="#FF5E5B"
      />
    </svg>
  );
}

function KofiCard({ lead }: { lead: boolean }) {
  const t = useTranslations("Support");
  return (
    <div className={cn(CHANNEL_CARD_CLS, "flex-col")}>
      <div className="flex items-center gap-2">
        <KofiMark />
        <span className="text-sm font-semibold text-zinc-900">Ko-fi</span>
      </div>
      <p className="flex-1 text-xs text-zinc-500">{t("kofiBody")}</p>
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={
          lead
            ? cn(ACTION_PRIMARY_CLS, "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-medium")
            : cn(ACTION_OUTLINE_CLS, "justify-center")
        }
      >
        {t("kofiButton")}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

function WechatCard({ lead }: { lead: boolean }) {
  const t = useTranslations("Support");
  return (
    <div className={cn(CHANNEL_CARD_CLS, lead ? "flex-col items-center text-center" : "items-center")}>
      <Image
        src={WECHAT_QR_SRC}
        alt={t("wechatQrAlt")}
        width={lead ? 168 : 112}
        height={lead ? 168 : 112}
        className="shrink-0 rounded-lg"
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-zinc-900">{t("wechatTitle")}</span>
        <span className="text-xs text-zinc-500">{t("wechatHint")}</span>
      </div>
    </div>
  );
}

const CHANNEL_CARDS: Record<DonationChannel, (props: { lead: boolean }) => React.ReactNode> = {
  kofi: KofiCard,
  wechat: WechatCard,
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

/** The ways to support Atlens: both tipping channels, this locale's usual one first, then free ways to help. */
export default function SupportPanel({ lensCount, className }: { lensCount: number; className?: string }) {
  const t = useTranslations("Support");
  const locale = useLocale();
  const [lead, second] = donationChannels(locale);
  const LeadCard = CHANNEL_CARDS[lead];
  const SecondCard = CHANNEL_CARDS[second];
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <p className="text-sm leading-relaxed text-zinc-500">{t("body", { count: lensCount })}</p>
      <div className={cn("grid gap-3", lead === "kofi" && "sm:grid-cols-2")}>
        <LeadCard lead />
        <SecondCard lead={false} />
      </div>
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
