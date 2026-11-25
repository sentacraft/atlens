import { getTranslations } from "next-intl/server";
import ReviewSearchLinks from "@/components/lens/ReviewSearchLinks";
import { buildReviewSearchLinks } from "@/lib/lens/review-search";
import type { Lens } from "@/lib/types";
import { SUBSECTION_HEADING_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

/** Search links to other sites' reviews, samples and discussions of the lens. */
export default async function LensReviewSearch({ lens, locale }: { lens: Lens; locale: string }) {
  const t = await getTranslations("LensReviews");
  const links = buildReviewSearchLinks({
    names: lens.searchAliases.review,
    locale,
    reviewKeyword: t("searchKeyword"),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {/* The block is the section's only content without highlights, so its title shows only beside them. */}
        <h3 className={cn(SUBSECTION_HEADING_CLS, "hidden group-has-[#lens-review-findings]/reviews:block")}>{t("title")}</h3>
        <p className="text-[13px] text-zinc-500">{t("subtitle")}</p>
      </div>
      <ReviewSearchLinks links={links} layout="list" />
    </div>
  );
}
