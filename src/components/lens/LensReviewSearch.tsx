import { getTranslations } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import PlatformMark from "@/components/logos/PlatformMark";
import { buildReviewSearchLinks } from "@/lib/lens/review-search";
import type { Lens } from "@/lib/types";
import { PAGE_SECTION_CLS, SECTION_HEADING_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

/** Search links to other sites' reviews, samples and discussions of the lens. */
export default async function LensReviewSearch({ lens, locale }: { lens: Lens; locale: string }) {
  const t = await getTranslations("LensReviews");
  const links = buildReviewSearchLinks({
    lens,
    locale,
    reviewKeyword: t("searchKeyword"),
  });

  return (
    <section aria-labelledby="lens-review-search" className={cn(PAGE_SECTION_CLS, "flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <h2 id="lens-review-search" className={SECTION_HEADING_CLS}>{t("title")}</h2>
        <p className="text-[13px] text-zinc-500">{t("subtitle")}</p>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-zinc-200 text-sm">
        {links.map((link) => (
          <li key={link.channel} className="border-b border-zinc-100 last:border-0">
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
          </li>
        ))}
      </ul>
    </section>
  );
}
