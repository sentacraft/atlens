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

/** A translator for the Pricing messages, from useTranslations or getTranslations. */
export type PricingTranslator = (key: string, values?: Record<string, string | number | Date>) => string;

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

export function formatPrice(t: PricingTranslator, price: number, currency: "CNY" | "USD"): string {
  return t("amount", { amount: price, currency });
}

/** A sampledAt calendar date ("2026-10-05") as UTC midnight, the time zone dates render in. */
export function sampledDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatSampledAt(t: PricingTranslator, isoDate: string): string {
  return t("sampledDate", { date: sampledDate(isoDate) });
}

export function formatPriceForReport(selection: PriceSelection, t: PricingTranslator): string {
  const { entry, condition } = selection;
  const price = formatPrice(t, entry.price, entry.currency);
  const conditionLabel = t(condition === "new" ? "conditionNew" : "conditionUsed");
  return `${price} · ${entry.source} · ${entry.sampledAt} · ${conditionLabel}`;
}
