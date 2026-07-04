import Image from "next/image";
import { Link } from "@/i18n/navigation";
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

function priceLabel(price: NonNullable<Recommendation["price"]>, locale: string): string {
  const symbol = price.currency === "CNY" ? "¥" : "$";
  const used = price.condition === "used" ? (locale === "zh" ? " 二手" : " used") : "";
  return `${symbol}${price.amount.toLocaleString()}${used}`;
}

// Thumbnail-left, text-right, filling its grid cell. The wider cell gives the
// title, key specs, and the model's reason room to breathe.
function RecommendationCard({ rec, locale }: { rec: Recommendation; locale: string }) {
  const weight = rec.weightG != null ? weightDisplay(rec.weightG, "g") : null;
  const meta = [rec.price ? priceLabel(rec.price, locale) : null, weight].filter(Boolean);

  return (
    <Link
      href={`/lenses/${mountToUrlSegment(rec.mount)}/${rec.id}`}
      prefetch={false}
      className="border-border bg-background hover:border-foreground/20 flex gap-3 rounded-xl border p-3 transition-colors"
    >
      <div className="relative h-28 w-28 shrink-0">
        <Image
          src={getLensImageUrl(rec.id)}
          alt={rec.name}
          fill
          sizes="112px"
          style={lensImageStyle}
          className="object-contain"
          loading="lazy"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="line-clamp-2 text-sm leading-snug font-semibold" title={rec.name}>
          {rec.name}
        </h4>
        {meta.length ? (
          <p className="text-foreground text-xs font-medium">{meta.join(" · ")}</p>
        ) : null}
        <div className="mt-0.5">
          <Markdown className={REASON_CLS}>{rec.reason}</Markdown>
        </div>
      </div>
    </Link>
  );
}
