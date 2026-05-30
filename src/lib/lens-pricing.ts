import type { LensPriceEntry } from "@/lib/types";

type Condition = "new" | "used";
type Market = "cn" | "global";

/** A price entry guaranteed to carry price + currency (what the UI renders). */
export type PricedEntry = LensPriceEntry & { price: number; currency: "CNY" | "USD" };

export interface PriceSelection {
  entry: PricedEntry;
  market: Market;
  condition: Condition;
}

type PricingBucket = { new?: LensPriceEntry[]; used?: LensPriceEntry };
type PricingData = { cn?: PricingBucket; global?: PricingBucket };

function isPriced(e: LensPriceEntry): e is PricedEntry {
  return e.price !== undefined && e.currency !== undefined;
}

/**
 * The displayed price for a market's `new` array: the first priced source.
 * The array is priority-ordered (publish sorts by storefront order), so this
 * is the most-preferred source carrying a price. Single source of truth for
 * "which new price do we show" — shared by pickPriceEntry and collections.
 */
export function pickNewEntry(entries: LensPriceEntry[] | undefined): PricedEntry | undefined {
  return entries?.find(isPriced);
}

// Translator is loosely typed so callers can pass next-intl's `t` function from
// either useTranslations (client) or getTranslations (server) without coupling
// this module to next-intl. `raw(key)` returns the unprocessed message string
// — used to fetch ICU templates we want to substitute manually.
type Translator = ((key: string, values?: Record<string, string | number>) => string) & {
  raw: (key: string) => string;
};

// Maps app locale → BCP-47 tag for Intl APIs. Project locales are always
// {zh, en}; fall back to en-US for any unexpected value.
function intlLocaleFor(locale: string): string {
  return locale === "zh" ? "zh-CN" : "en-US";
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocaleFor(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}

export function pickPriceEntry(
  pricing: PricingData | undefined,
  locale: string
): PriceSelection | null {
  const market: Market = locale === "zh" ? "cn" : "global";
  const bucket = pricing?.[market];
  const newEntry = pickNewEntry(bucket?.new);
  if (newEntry) {
    return { entry: newEntry, market, condition: "new" };
  }
  if (bucket?.used && isPriced(bucket.used)) {
    return { entry: bucket.used, market, condition: "used" };
  }
  return null;
}

export function formatPrice(
  price: number,
  currency: "CNY" | "USD",
  locale: string,
  // Unused; retained for callsite API stability. Both new and used prices
  // render as bare numbers (no ~ prefix). The visual "Used" indication is
  // handled by a separate badge component, not by mutating the number.
  _condition: Condition,
  // CNY display template, e.g. "{value} Yuan" (zh) or "¥{value}" (en). Pass the
  // resolved i18n value (`t.raw("cnyAmount")` or `labels.cnyAmount` for the
  // props-driven SharePoster). The {value} placeholder is replaced with the
  // locale-formatted number.
  cnyTemplate: string
): string {
  if (currency === "CNY") {
    return cnyTemplate.replace("{value}", formatNumber(price, locale));
  }
  return new Intl.NumberFormat(intlLocaleFor(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatSampledAt(date: string, locale: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(intlLocaleFor(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPriceForReport(
  selection: PriceSelection,
  locale: string,
  t: Translator
): string {
  const { entry, condition } = selection;
  const price = formatPrice(entry.price, entry.currency, locale, condition, t.raw("cnyAmount"));
  const conditionLabel = t(condition === "new" ? "conditionNew" : "conditionUsed");
  return `${price} · ${entry.source} · ${entry.sampledAt} · ${conditionLabel}`;
}
