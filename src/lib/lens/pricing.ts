import type { LensPriceEntry } from "@/lib/types";

type Condition = "new" | "used";
type Market = "cn" | "global";

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

export function pickNewEntry(entries: LensPriceEntry[] | undefined): PricedEntry | undefined {
  return entries?.find(isPriced);
}

type Translator = ((key: string, values?: Record<string, string | number>) => string) & {
  raw: (key: string) => string;
};

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
  const price = formatPrice(entry.price, entry.currency, locale, t.raw("cnyAmount"));
  const conditionLabel = t(condition === "new" ? "conditionNew" : "conditionUsed");
  return `${price} · ${entry.source} · ${entry.sampledAt} · ${conditionLabel}`;
}
