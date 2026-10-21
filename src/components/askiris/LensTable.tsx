"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import {
  apertureDisplay,
  filterSizeDisplay,
  focalRangeDisplay,
  mfdHeroValue,
  weightDisplay,
  wrDisplay,
} from "@/lib/lens/format";
import { formatPrice, type PricingTranslator } from "@/lib/lens/pricing";
import type { LensTableColumn, ResolvedLens } from "@/lib/ai/recall";
import { lensPath } from "@/lib/url/routes";

type Labels = {
  yes: string;
  no: string;
  partial: string;
  auto: string;
  manual: string;
  used: string;
  na: string;
  pricing: PricingTranslator;
};

const DETAIL_HEADER_KEY = {
  focalNative: "focalLength",
  focalEquiv: "focalLengthEquiv",
  aperture: "maxAperture",
  weight: "weight",
  magnification: "maxMagnification",
  minFocusDistance: "minFocusDist",
  apertureRing: "apertureRing",
  wr: "wr",
  filterThread: "filterSize",
  releaseYear: "releaseYear",
} as const satisfies Record<Exclude<LensTableColumn, "price" | "focus">, string>;

function priceCell(price: NonNullable<ResolvedLens["price"]>, l: Labels): string {
  const amount = formatPrice(l.pricing, price.amount, price.currency);
  return price.condition === "used" ? `${amount} ${l.used}` : amount;
}

// EVAL MIRROR: eval/promptfoo/provider.mjs hand-writes what the judges read from this table.
const RENDERERS: Record<LensTableColumn, (lens: ResolvedLens, l: Labels) => string | null> = {
  focalEquiv: (lens) => focalRangeDisplay(lens.focalEquivMm[0], lens.focalEquivMm[1]),
  focalNative: (lens) => focalRangeDisplay(lens.focalNativeMm[0], lens.focalNativeMm[1]),
  aperture: (lens) => (lens.maxAperture != null ? apertureDisplay(lens.maxAperture) : null),
  weight: (lens) => weightDisplay(lens.weightG ?? undefined, "g") ?? null,
  price: (lens, l) => (lens.price ? priceCell(lens.price, l) : null),
  magnification: (lens) => (lens.magnification != null ? `${lens.magnification}×` : null),
  minFocusDistance: (lens) => mfdHeroValue(lens.minFocusDistance) ?? null,
  focus: (lens, l) => (lens.af ? l.auto : l.manual),
  apertureRing: (lens, l) => (lens.apertureRing ? l.yes : l.no),
  wr: (lens, l) => wrDisplay(lens.wr, { yes: l.yes, no: l.no, partial: l.partial }),
  filterThread: (lens) => filterSizeDisplay(lens.filterMm) ?? null,
  releaseYear: (lens) => (lens.releaseYear != null ? String(lens.releaseYear) : null),
};

export default function LensTable({
  lenses,
  columns,
  caption,
}: {
  lenses: ResolvedLens[];
  columns: LensTableColumn[];
  caption: string | null;
}) {
  const t = useTranslations("AskIris.table");
  const td = useTranslations("LensDetail");
  const tp = useTranslations("Pricing");

  const labels: Labels = {
    yes: td("yes"),
    no: td("no"),
    partial: td("partial"),
    auto: t("auto"),
    manual: t("manual"),
    used: t("used"),
    na: td("missing"),
    pricing: tp,
  };

  const headerFor = (col: LensTableColumn): string => {
    if (col === "price") {
      return tp("fieldLabel");
    }
    if (col === "focus") {
      return t("focus");
    }
    return td(DETAIL_HEADER_KEY[col]);
  };

  return (
    <figure className="border-border bg-background my-1 w-full overflow-hidden rounded-xl border">
      {caption ? (
        <figcaption className="text-muted-foreground border-border border-b px-3.5 py-2 text-xs">
          {caption}
        </figcaption>
      ) : null}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-left text-xs">
              <th scope="col" className="px-3.5 py-2 font-medium">
                {t("lensHeader")}
              </th>
              {columns.map((col) => (
                <th scope="col" key={col} className="px-3.5 py-2 font-medium whitespace-nowrap">
                  {headerFor(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lenses.map((lens) => (
              <tr
                key={lens.id}
                onClick={(e) => e.currentTarget.querySelector("a")?.click()}
                className="border-border hover:bg-muted/40 cursor-pointer border-b transition-colors last:border-b-0"
              >
                <th scope="row" className="px-3.5 py-2 text-left font-normal">
                  <Link
                    href={lensPath(lens)}
                    prefetch={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      track("askiris_rec_click", { lens_id: lens.id, source: "askiris_table" });
                    }}
                    // New tab: a same-tab navigation would discard the conversation.
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary font-medium underline-offset-2 hover:underline"
                  >
                    {lens.name}
                  </Link>
                </th>
                {columns.map((col) => (
                  <td key={col} className="text-foreground px-3.5 py-2 whitespace-nowrap tabular-nums">
                    {RENDERERS[col](lens, labels) ?? (
                      <span className="text-muted-foreground">{labels.na}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
