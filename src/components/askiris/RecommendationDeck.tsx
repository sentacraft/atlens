import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { mountToUrlSegment } from "@/lib/mount";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { focalRangeDisplay, apertureDisplay, weightDisplay } from "@/lib/lens/format";
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
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

function RecommendationCard({ rec, locale }: { rec: Recommendation; locale: string }) {
  const specs = [
    focalRangeDisplay(rec.focalEquivMm[0], rec.focalEquivMm[1]),
    rec.maxAperture != null ? apertureDisplay(rec.maxAperture) : null,
    rec.weightG != null ? weightDisplay(rec.weightG, "g") : null,
  ].filter(Boolean);

  return (
    <Link
      href={`/lenses/${mountToUrlSegment(rec.mount)}/${rec.id}`}
      prefetch={false}
      className="border-border bg-background hover:border-foreground/20 flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border transition-colors"
    >
      <div className="bg-muted/40 relative h-16 shrink-0">
        <Image
          src={getLensImageUrl(rec.id)}
          alt={rec.model}
          fill
          sizes="176px"
          style={lensImageStyle}
          className="object-contain p-2"
          loading="lazy"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1 p-2.5">
        <p className="text-muted-foreground truncate text-[10px] tracking-wide uppercase">
          {rec.brand}
          {rec.series ? ` · ${rec.series}` : ""}
        </p>
        <h4 className="line-clamp-2 text-xs leading-snug font-semibold" title={rec.model}>
          {rec.model}
        </h4>
        <p className="text-muted-foreground truncate text-[10px]">{specs.join(" · ")}</p>
        {rec.price ? (
          <p className="text-foreground text-xs font-medium">{priceLabel(rec.price, locale)}</p>
        ) : null}
        <div className="text-muted-foreground mt-0.5 text-[11px] [&_p]:line-clamp-2 [&_strong]:text-foreground [&_strong]:font-semibold">
          <Markdown>{rec.reason}</Markdown>
        </div>
      </div>
    </Link>
  );
}
