import { createTranslator } from "next-intl";
import type { LensTableColumn, ResolvedLens } from "@/lib/ai/recall";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import type { NamespaceTranslator } from "@/i18n/translator";
import {
  apertureDisplay,
  dimensionsPrimaryDisplay,
  lensConfigurationDisplay,
  tStopDisplay,
  type LensConfigurationLabels,
  filterSizeDisplay,
  focalRangeDisplay,
  mfdHeroValue,
  oisDisplay,
  weightDisplay,
  wrDisplay,
} from "@/lib/lens/format";
import { buildSpecGroupLabels } from "@/lib/lens/spec-groups";
import { formatPrice, type PricingTranslator } from "@/lib/lens/pricing";
import { SPEC_NA } from "@/lib/types";

export type TableLabels = {
  yes: string;
  no: string;
  partial: string;
  auto: string;
  manual: string;
  used: string;
  na: string;
  construction: LensConfigurationLabels;
  pricing: PricingTranslator;
};

export function buildTableLabels({ detail, table, pricing }: {
  detail: NamespaceTranslator<"LensDetail">;
  table: (key: "auto" | "manual" | "used") => string;
  pricing: PricingTranslator;
}): TableLabels {
  return {
    yes: detail("yes"),
    no: detail("no"),
    partial: detail("partial"),
    auto: table("auto"),
    manual: table("manual"),
    used: table("used"),
    na: detail("missing"),
    construction: buildSpecGroupLabels(detail).lc,
    pricing,
  };
}

/** The labels the table shows in this locale, for the text the model reads. */
export function tableLabelsForLocale(locale: string): TableLabels {
  const messages = locale === "zh" ? zh : en;
  const scoped = <N extends string>(namespace: N) => createTranslator({ locale: locale === "zh" ? "zh" : "en", messages, namespace } as never);
  return buildTableLabels({
    detail: scoped("LensDetail") as unknown as NamespaceTranslator<"LensDetail">,
    table: scoped("AskIris.table") as unknown as (key: "auto" | "manual" | "used") => string,
    pricing: scoped("Pricing") as unknown as PricingTranslator,
  });
}

function priceCell(price: NonNullable<ResolvedLens["price"]>, l: TableLabels): string {
  const amount = formatPrice(l.pricing, price.amount, price.currency);
  return price.condition === "used" ? `${amount} ${l.used}` : amount;
}

// EVAL MIRROR: eval/promptfoo/provider.mjs hand-writes what the judges read from this table.
export const LENS_TABLE_RENDERERS: Record<LensTableColumn, (lens: ResolvedLens, l: TableLabels) => string | null> = {
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
  length: (lens) => (lens.length?.mm != null ? `${lens.length.mm}mm` : null),
  ois: (lens, l) => oisDisplay(lens.ois, lens.oisStops, { yes: l.yes, no: l.no }),
  releaseYear: (lens) => (lens.releaseYear != null ? String(lens.releaseYear) : null),
  lensConfiguration: (lens, l) => lensConfigurationDisplay(lens.lensConfiguration, l.construction) ?? null,
  apertureBladeCount: (lens) => lens.apertureBladeCount === SPEC_NA ? SPEC_NA : lens.apertureBladeCount?.toString() ?? null,
  minAperture: (lens) => lens.minAperture == null ? null : apertureDisplay(lens.minAperture),
  maxTStop: (lens) => tStopDisplay(lens.maxTStop) ?? null,
  minTStop: (lens) => tStopDisplay(lens.minTStop) ?? null,
  dimensions: (lens) => dimensionsPrimaryDisplay(lens.diameterMm, lens.length) ?? null,
  focusMotor: (lens) => lens.focusMotor ?? null,
  lensMaterial: (lens) => lens.lensMaterial ?? null,
};

