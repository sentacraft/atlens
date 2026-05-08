import type { LensPriceEntry } from "@/lib/types";

type Condition = "new" | "used";
type Market = "cn" | "global";

export interface PriceSelection {
  entry: LensPriceEntry;
  market: Market;
  condition: Condition;
}

type PricingBucket = { new?: LensPriceEntry; used?: LensPriceEntry };
type PricingData = { cn?: PricingBucket; global?: PricingBucket };

export function pickPriceEntry(
  pricing: PricingData | undefined,
  locale: string
): PriceSelection | null {
  const market: Market = locale === "zh" ? "cn" : "global";
  const bucket = pricing?.[market];
  if (bucket?.new) {
    return { entry: bucket.new, market, condition: "new" };
  }
  if (bucket?.used) {
    return { entry: bucket.used, market, condition: "used" };
  }
  return null;
}

const CNY_THRESHOLDS: readonly number[] = [0, 500, 1500, 5000, 15000];
const USD_THRESHOLDS: readonly number[] = [0, 150, 400, 800, 1500];

export function tierRange(
  tier: 1 | 2 | 3 | 4 | 5,
  currency: "CNY" | "USD"
): { min: number; max: number | null } {
  const thresholds = currency === "CNY" ? CNY_THRESHOLDS : USD_THRESHOLDS;
  const min = thresholds[tier - 1];
  const max = tier < 5 ? thresholds[tier] - 1 : null;
  return { min, max };
}

// Numeric-only range, no currency symbol — the caller pairs it with $$$ / ¥¥¥.
// Examples: "1,500–4,999", "15,000+"
export function formatTierRange(
  tier: 1 | 2 | 3 | 4 | 5,
  currency: "CNY" | "USD",
  locale: string
): string {
  const { min, max } = tierRange(tier, currency);
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  const fmt = (n: number) =>
    new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(n);
  if (max === null) {
    return `${fmt(min)}+`;
  }
  return `${fmt(min)}–${fmt(max)}`;
}

export function formatPrice(
  price: number,
  currency: "CNY" | "USD",
  locale: string,
  condition: Condition
): string {
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  let formatted: string;
  if (currency === "CNY") {
    // "5,490 元" — value with thousand separators, suffix " 元"
    formatted = `${new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 0,
    }).format(price)} 元`;
  } else {
    formatted = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }
  return condition === "used" ? `~${formatted}` : formatted;
}

export function formatSampledAt(date: string, locale: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Translator is loosely typed so callers can pass next-intl's `t` function from
// either useTranslations (client) or getTranslations (server) without coupling
// this module to next-intl.
type Translator = (key: string) => string;

export function formatSource(source: string, t: Translator): string {
  return t(`source.${source}`);
}

export function formatPriceForReport(
  selection: PriceSelection,
  locale: string,
  t: Translator
): string {
  const { entry, condition } = selection;
  const price = formatPrice(entry.price, entry.currency, locale, condition);
  const source = formatSource(entry.source, t);
  const conditionLabel = t(condition === "new" ? "conditionNew" : "conditionUsed");
  return `${price} · ${source} · ${entry.sampledAt} · ${conditionLabel}`;
}
