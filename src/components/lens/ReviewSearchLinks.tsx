import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import PlatformMark from "@/components/logos/PlatformMark";
import { REVIEW_SEARCH_PILL_CLS } from "@/config/ui-tokens";
import type { ReviewSearchChannel, ReviewSearchLink } from "@/lib/lens/review-search";
import { cn } from "@/lib/utils";

// The marks fill their square unevenly (Google's G fills it, Flickr's dots are under half as
// tall); standing in compact pills, each gets an optically balanced size.
const PILL_ICON_SIZE: Record<ReviewSearchChannel, number> = {
  bilibili: 13,
  youtube: 14,
  bing: 12,
  google: 12,
  flickr: 16,
  reddit: 13,
};

/** One lens's searches on other sites: a bordered list of rows, or compact single-line pills. */
export default function ReviewSearchLinks({ links, layout }: { links: ReviewSearchLink[]; layout: "list" | "pills" }) {
  const t = useTranslations("LensReviews");
  return (
    <ul
      className={cn(
        layout === "list"
          ? "overflow-hidden rounded-2xl border border-zinc-200 text-sm"
          : "flex flex-wrap gap-1.5 text-xs",
      )}
    >
      {links.map((link) => (
        <li
          key={link.channel}
          className={cn("min-w-0", layout === "list" && "border-b border-zinc-100 last:border-0")}
        >
          {layout === "list" ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-3 px-4 py-3 text-zinc-900 transition-colors hover:bg-zinc-50"
            >
              <PlatformMark channel={link.channel} className="shrink-0 text-black" />
              <span className="flex-1">
                {t(`channel.${link.channel}`)}
                <span className="text-zinc-500"> · {t(`kind.${link.kind}`)}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
            </a>
          ) : (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${t(`channel.${link.channel}`)} · ${t(`kind.${link.kind}`)}`}
              aria-label={`${t(`channel.${link.channel}`)} · ${t(`kind.${link.kind}`)}`}
              className={REVIEW_SEARCH_PILL_CLS}
            >
              <PlatformMark channel={link.channel} size={PILL_ICON_SIZE[link.channel]} className="shrink-0 text-black" />
              <span>{t(`channel.${link.channel}`)}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
