import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { mountToUrlSegment } from "@/lib/mount";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { lensDisplayName, weightDisplay } from "@/lib/lens/format";
import Markdown from "@/components/askiris/Markdown";
import type { Recommendation } from "@/lib/ai/recall";

// A group of picks the model authored in one recommendLenses call, laid out as a
// horizontal scroll-snap shelf so the deck stays one card-row tall on every
// viewport — that's what keeps a multi-deck reply's structure scannable (the next
// deck's heading never gets pushed off-screen by a tall vertical list).
export default function RecommendationDeck({
  recommendations,
  locale,
}: {
  recommendations: Recommendation[];
  locale: string;
}) {
  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} locale={locale} />
      ))}
    </div>
  );
}

function priceLabel(price: NonNullable<Recommendation["price"]>, locale: string): string {
  const symbol = price.currency === "CNY" ? "¥" : "$";
  const used = price.condition === "used" ? (locale === "zh" ? " 二手" : " used") : "";
  return `${symbol}${price.amount.toLocaleString()}${used}`;
}

// Thumbnail-left, text-right: a short card (~one image tall) that fills the column
// width and gives the model's reason room to be read, rather than a tall column
// card whose reason gets clamped to a couple of words.
function RecommendationCard({ rec, locale }: { rec: Recommendation; locale: string }) {
  const name = lensDisplayName(rec.brand, rec.series, rec.model);
  const weight = rec.weightG != null ? weightDisplay(rec.weightG, "g") : null;
  const meta = [rec.price ? priceLabel(rec.price, locale) : null, weight].filter(Boolean);

  return (
    <Link
      href={`/lenses/${mountToUrlSegment(rec.mount)}/${rec.id}`}
      prefetch={false}
      className="border-border bg-background hover:border-foreground/20 flex w-72 shrink-0 snap-start gap-3 rounded-xl border p-2.5 transition-colors"
    >
      <div className="bg-muted/40 relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={getLensImageUrl(rec.id)}
          alt={rec.model}
          fill
          sizes="96px"
          style={lensImageStyle}
          className="object-contain p-1.5"
          loading="lazy"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h4 className="line-clamp-2 text-xs leading-snug font-semibold" title={name}>
          {name}
        </h4>
        {meta.length ? (
          <p className="text-foreground text-xs font-medium">{meta.join(" · ")}</p>
        ) : null}
        <div className="text-muted-foreground mt-0.5 text-[11px] leading-snug [&_p]:line-clamp-3 [&_strong]:text-foreground [&_strong]:font-semibold">
          <Markdown>{rec.reason}</Markdown>
        </div>
      </div>
    </Link>
  );
}
