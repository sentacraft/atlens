"use client";

import Image from "next/image";
import { Weight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { mountToUrlSegment } from "@/lib/mount";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { weightDisplay } from "@/lib/lens/format";
import Markdown from "@/components/askiris/Markdown";
import type { Recommendation } from "@/lib/ai/recall";

// A group of picks the model authored in one recommendLenses call, laid out as a
// one-or-two-column grid (one on mobile, two on desktop). Following the
// ChatGPT/Perplexity pattern, each card is self-describing: it carries its own
// reason so the surrounding prose stays a short synthesis instead of a per-lens
// essay the reader has to map back onto a card.
export default function RecommendationDeck({
  recommendations,
  locale,
}: {
  recommendations: Recommendation[];
  locale: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} locale={locale} />
      ))}
    </div>
  );
}

// Non-prose styling for the reason inside a card. Shown in full — the reason is
// the card's whole point, and the prompt already bounds it to one to three
// sentences, so there's no clamp to truncate the model's case.
const REASON_CLS =
  "text-muted-foreground text-xs leading-relaxed [&_p]:m-0 [&_strong]:text-foreground [&_strong]:font-medium";

function priceParts(
  price: NonNullable<Recommendation["price"]>,
  locale: string,
): { symbol: string; value: string } {
  const symbol = price.currency === "CNY" ? "¥" : "$";
  const used = price.condition === "used" ? (locale === "zh" ? " 二手" : " used") : "";
  return { symbol, value: `${price.amount.toLocaleString()}${used}` };
}

// Two rows: a header (thumbnail + name + price/weight) and the reason on its own
// full-width row below, so the reason spans the whole card instead of a narrow
// column beside the thumbnail — fewer wrapped lines, better use of the space.
function RecommendationCard({ rec, locale }: { rec: Recommendation; locale: string }) {
  const weight = rec.weightG != null ? weightDisplay(rec.weightG, "g") : null;
  const price = rec.price ? priceParts(rec.price, locale) : null;

  return (
    <Link
      href={`/lenses/${mountToUrlSegment(rec.mount)}/${rec.id}`}
      prefetch={false}
      onClick={() => track("askiris_rec_click", { lens_id: rec.id, source: "askiris" })}
      // Opens in a new tab: the AskIris thread is ephemeral client state, so a
      // same-tab nav would discard the conversation the user is working through.
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-background hover:border-foreground/20 flex flex-col gap-2 rounded-xl border p-3.5 transition-colors"
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

        {/* Top-aligned with the thumbnail: the name sits at the top and the
            price/weight follow directly beneath it, not pinned to the thumbnail's
            base. The 96px thumbnail sets the header height; the full-width reason
            row below always clears it. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h4 className="line-clamp-2 text-sm leading-snug font-semibold" title={rec.name}>
            {rec.name}
          </h4>
          {price || weight ? (
            <div className="text-foreground flex flex-wrap items-center gap-x-2 text-xs font-medium">
              {price ? (
                <span className="inline-flex items-baseline gap-1">
                  <span className="text-muted-foreground">{price.symbol}</span>
                  {price.value}
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
  );
}
