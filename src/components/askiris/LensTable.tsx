"use client";

import { Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { useScrollAffordance } from "@/hooks/useScrollAffordance";
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

// Opaque, unlike the row's own hover: the pinned name column covers cells scrolling under it.
const NAME_CELL_CLS = "sticky left-0 z-[1] min-w-36 max-w-48 border-r border-zinc-100 bg-white px-3.5 py-2 text-left";

export default function LensTable({
  lenses,
  columns,
  caption,
  onExpand,
}: {
  lenses: ResolvedLens[];
  columns: LensTableColumn[];
  caption: string | null;
  /** Widens the chat so the table fits; offered only while the table scrolls sideways. */
  onExpand?: () => void;
}) {
  const t = useTranslations("AskIris.table");
  const td = useTranslations("LensDetail");
  const tp = useTranslations("Pricing");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollAffordance(scrollRef, [lenses, columns]);
  const expandable = onExpand !== undefined && (canScrollLeft || canScrollRight);

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
      {caption || expandable ? (
        <figcaption className="text-muted-foreground border-border flex items-center gap-2 border-b py-1.5 pr-1.5 pl-3.5 text-xs">
          <span className="min-w-0 flex-1">{caption}</span>
          {expandable ? (
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Maximize2 className="size-3.5" aria-hidden />
              {t("expand")}
            </button>
          ) : null}
        </figcaption>
      ) : null}
      <div ref={scrollRef} className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-left text-xs">
              <th scope="col" className={`${NAME_CELL_CLS} font-medium`}>
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
                className="group border-border cursor-pointer border-b transition-colors last:border-b-0 hover:bg-zinc-50"
              >
                <th scope="row" className={`${NAME_CELL_CLS} font-normal transition-colors group-hover:bg-zinc-50`}>
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
