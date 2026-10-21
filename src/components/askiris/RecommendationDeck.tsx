"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Weight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { weightDisplay } from "@/lib/lens/format";
import { formatPrice } from "@/lib/lens/pricing";
import Markdown from "@/components/askiris/Markdown";
import FavoriteStarButton from "@/components/lens/FavoriteStarButton";
import type { Recommendation } from "@/lib/ai/recall";
import { lensPath } from "@/lib/url/routes";

export default function RecommendationDeck({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    // Columns follow the chat's own width, not the screen's: the side panel is narrow on any screen.
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        {recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
    </div>
  );
}

const REASON_CLS =
  "text-muted-foreground text-xs leading-relaxed [&_p]:m-0 [&_strong]:text-foreground [&_strong]:font-medium";

// EVAL MIRROR: `formatCard` in eval/promptfoo/provider.mjs hand-writes what the judges read
// for a card.
function RecommendationCard({ rec }: { rec: Recommendation }) {
  const tPricing = useTranslations("Pricing");
  const weight = rec.weightG != null ? weightDisplay(rec.weightG, "g") : null;
  const price = rec.price ? formatPrice(tPricing, rec.price.amount, rec.price.currency) : null;

  return (
    <div className="group border-border bg-background hover:border-foreground/20 relative rounded-xl border transition-colors">
      <Link
        href={lensPath(rec)}
        prefetch={false}
        onClick={() => track("askiris_rec_click", { lens_id: rec.id, source: "askiris" })}
        // New tab: a same-tab navigation would discard the conversation.
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col gap-2 p-3.5"
      >
        <div className="flex gap-3.5">
          <div className="bg-muted relative size-24 shrink-0 rounded-xl">
            <Image
              src={getLensImageUrl(rec.id)}
              alt={rec.name}
              fill
              sizes="96px"
              style={lensImageStyle}
              className="object-contain p-3.5"
              loading="lazy"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h4 className="line-clamp-2 pr-8 text-sm leading-snug font-semibold" title={rec.name}>
              {rec.name}
            </h4>
            {price || weight ? (
              <div className="text-foreground flex flex-wrap items-center gap-x-2 text-xs font-medium">
                {price ? (
                  <span className="inline-flex items-baseline gap-1">
                    {price}
                    {rec.price?.condition === "used" && (
                      <span className="text-muted-foreground">{tPricing("conditionUsed")}</span>
                    )}
                  </span>
                ) : null}
                {price && weight ? <span className="text-muted-foreground">·</span> : null}
                {weight ? (
                  <span className="inline-flex items-center gap-1">
                    <Weight className="text-muted-foreground size-3" aria-hidden />
                    {weight}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <Markdown className={REASON_CLS}>{rec.reason}</Markdown>
      </Link>
      <FavoriteStarButton lensId={rec.id} className="absolute top-2 right-2" />
    </div>
  );
}
