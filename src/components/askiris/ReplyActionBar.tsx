"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useChatLinkTargets } from "@/components/askiris/ChatLinkContext";
import ReviewSearchChip from "@/components/askiris/ReviewSearchChip";
import { REPLY_ACTION_PILL_CLS } from "@/config/ui-tokens";
import { canResolveReplyAction, replyActionKey, type ReplyAction } from "@/lib/askiris/reply-actions";
import type { LensLinkTarget } from "@/lib/ai/lens-ref";
import { buildComparePath } from "@/lib/url/compare";

const ACTION_ICON_CLS = "size-3.5 shrink-0 text-zinc-500";

/** Fixed-label action pills rendered below Iris's prose so triggers never break inline punctuation. */
export default function ReplyActionBar({ actions }: { actions: ReplyAction[] }) {
  const t = useTranslations("AskIris.reviewSearch");
  const targets = useChatLinkTargets();
  if (actions.length === 0 || !targets) {
    return null;
  }

  const resolved: { action: ReplyAction; known: LensLinkTarget[] }[] = [];
  for (const action of actions) {
    if (!canResolveReplyAction(action, targets.lenses)) {
      continue;
    }
    resolved.push({
      action,
      known: action.refs.map((ref) => targets.lenses[ref]!),
    });
  }

  if (resolved.length === 0) {
    return null;
  }

  const reviewsCount = resolved.filter((item) => item.action.kind === "reviews").length;
  const compareCount = resolved.length - reviewsCount;

  const items = resolved.map(({ action, known }) => {
    const key = replyActionKey(action);
    const lensSummary = known.map((entry) => entry.name).join(" / ");
    const ariaSummary = known.map((entry) => entry.name).join(", ");
    if (action.kind === "reviews") {
      const baseLabel = known.length === 1 ? t("triggerSingle") : t("triggerMulti", { count: String(known.length) });
      const text = reviewsCount > 1 ? `${baseLabel} · ${lensSummary}` : baseLabel;
      const ariaLabel = reviewsCount > 1 ? `${baseLabel}: ${ariaSummary}` : undefined;
      return (
        <ReviewSearchChip
          key={key}
          lenses={known}
          className={REPLY_ACTION_PILL_CLS}
          iconClassName={ACTION_ICON_CLS}
          iconPosition="leading"
          ariaLabel={ariaLabel}
        >
          <span className="truncate">{text}</span>
        </ReviewSearchChip>
      );
    }
    const baseLabel = t("compareAction", { count: String(known.length) });
    const text = compareCount > 1 ? `${baseLabel} · ${lensSummary}` : baseLabel;
    const ariaLabel = compareCount > 1 ? `${baseLabel}: ${ariaSummary}` : undefined;
    return (
      <Link
        key={key}
        href={buildComparePath(known[0].mount, known.map((entry) => entry.id))}
        prefetch={false}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={REPLY_ACTION_PILL_CLS}
      >
        <span className="truncate">{text}</span>
        <ArrowUpRight className={ACTION_ICON_CLS} aria-hidden />
      </Link>
    );
  });

  return <div className="mt-1.5 flex flex-wrap gap-2 px-1">{items}</div>;
}
