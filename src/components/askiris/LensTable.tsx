"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { mountToUrlSegment } from "@/lib/mount";
import {
  apertureDisplay,
  filterSizeDisplay,
  focalRangeDisplay,
  mfdHeroValue,
  weightDisplay,
  wrDisplay,
} from "@/lib/lens/format";
import type { LensTableColumn, ResolvedLens } from "@/lib/ai/recall";

// The neutral counterpart to RecommendationDeck: a listLenses call renders as a
// spec table with no reasons, so the user reads the objective columns and judges.
// The whole row links to the lens's page (new tab, like the cards) — the row click
// delegates to the row's name link so locale-prefixing, new-tab, and tracking all
// run through one path — giving the clickable exit a plain markdown table couldn't.
//
// Labels and value formatting are the SAME layer the detail and compare pages use:
// column headers come from the shared LensDetail / Pricing i18n namespaces, and the
// cell values run through src/lib/lens/format. Only the markup is AskIris's own —
// the compare table is transposed (specs as rows), so its JSX doesn't fit here.

type Labels = {
  yes: string;
  no: string;
  partial: string;
  auto: string;
  manual: string;
  used: string;
  na: string;
};

// The LensDetail label key each column borrows for its header. price (Pricing
// namespace) and focus (AskIris-specific auto/manual) are resolved separately.
const DETAIL_HEADER_KEY: Record<
  Exclude<LensTableColumn, "price" | "focus">,
  string
> = {
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
};

function priceCell(price: NonNullable<ResolvedLens["price"]>, usedLabel: string): string {
  const symbol = price.currency === "CNY" ? "¥" : "$";
  const used = price.condition === "used" ? ` ${usedLabel}` : "";
  return `${symbol}${price.amount.toLocaleString()}${used}`;
}

// Each column turns a resolved lens into one display string (or null when the lens
// has no data for it — rendered as a dash). Values run through the shared format
// helpers; enum-like values (focus, WR, aperture ring) resolve through localized
// labels rather than raw booleans.
//
// EVAL MIRROR — the table block in eval/promptfoo/provider.mjs hand-writes what the
// judges read, and nothing keeps the two in step. It carries the caption and the lens
// names but no cell values, because no rubric reads them; adding a column here is a
// change to this table only until a rubric starts grading what the cells say.
const RENDERERS: Record<LensTableColumn, (lens: ResolvedLens, l: Labels) => string | null> = {
  focalEquiv: (lens) => focalRangeDisplay(lens.focalEquivMm[0], lens.focalEquivMm[1]),
  focalNative: (lens) => focalRangeDisplay(lens.focalNativeMm[0], lens.focalNativeMm[1]),
  aperture: (lens) => (lens.maxAperture != null ? apertureDisplay(lens.maxAperture) : null),
  weight: (lens) => weightDisplay(lens.weightG ?? undefined, "g") ?? null,
  price: (lens, l) => (lens.price ? priceCell(lens.price, l.used) : null),
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
      {/* Wide tables scroll inside their own container so the thread body never
          scrolls horizontally, even on mobile with many columns. */}
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
                    href={`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`}
                    prefetch={false}
                    // Stop the click bubbling to the row handler, which would
                    // re-trigger this same link — a direct name click fires once.
                    onClick={(e) => {
                      e.stopPropagation();
                      track("askiris_rec_click", { lens_id: lens.id, source: "askiris_table" });
                    }}
                    // New tab: the thread is ephemeral client state, so a same-tab
                    // nav would discard the conversation in progress.
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
