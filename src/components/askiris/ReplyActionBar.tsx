"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useChatLinkTargets } from "@/components/askiris/ChatLinkContext";
import ReviewSearchChip from "@/components/askiris/ReviewSearchChip";
import type { ReplyAction } from "@/lib/askiris/reply-actions";
import { buildComparePath } from "@/lib/url/compare";

const ACTION_PILL_CLS =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-[13px] font-medium whitespace-nowrap text-zinc-900 no-underline transition-colors hover:border-zinc-300 hover:bg-zinc-50";
const ACTION_ICON_CLS = "size-3.5 shrink-0 text-zinc-500";

/** Fixed-label action pills rendered below Iris's prose so triggers never break inline punctuation. */
export default function ReplyActionBar({ actions }: { actions: ReplyAction[] }) {
  const t = useTranslations("AskIris.reviewSearch");
  const targets = useChatLinkTargets();
  if (actions.length === 0 || !targets) {
    return null;
  }

  const items = actions.flatMap((action) => {
    const entries = action.refs.map((ref) => targets.lenses[ref]);
    const known = entries.filter((entry) => entry !== undefined);
    if (known.length !== entries.length) {
      return [];
    }
    if (action.kind === "compare" && new Set(known.map((entry) => entry.mount)).size !== 1) {
      return [];
    }
    const key = `${action.kind}:${action.refs.join(",")}`;
    if (action.kind === "reviews") {
      const label = known.length === 1 ? t("triggerSingle") : t("triggerMulti", { count: String(known.length) });
      return [
        <ReviewSearchChip
          key={key}
          lenses={known}
          className={ACTION_PILL_CLS}
          iconClassName={ACTION_ICON_CLS}
          iconPosition="leading"
        >
          <span>{label}</span>
        </ReviewSearchChip>,
      ];
    }
    return [
      <Link
        key={key}
        href={buildComparePath(known[0].mount, known.map((entry) => entry.id))}
        prefetch={false}
        target="_blank"
        rel="noopener noreferrer"
        className={ACTION_PILL_CLS}
      >
        <span>{t("compareAction", { count: String(known.length) })}</span>
        <ArrowUpRight className={ACTION_ICON_CLS} aria-hidden />
      </Link>,
    ];
  });

  if (items.length === 0) {
    return null;
  }
  return <div className="mt-1.5 flex flex-wrap gap-2 px-1">{items}</div>;
}
