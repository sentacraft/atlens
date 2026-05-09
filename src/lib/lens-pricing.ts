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

// Translator is loosely typed so callers can pass next-intl's `t` function from
// either useTranslations (client) or getTranslations (server) without coupling
// this module to next-intl.
type Translator = (key: string, values?: Record<string, string | number>) => string;

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
  if (bucket?.new) {
    return { entry: bucket.new, market, condition: "new" };
  }
  if (bucket?.used) {
    return { entry: bucket.used, market, condition: "used" };
  }
  return null;
}

export const CNY_THRESHOLDS: readonly number[] = [0, 500, 1500, 5000, 15000];
export const USD_THRESHOLDS: readonly number[] = [0, 150, 400, 800, 1500];

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
  if (max === null) {
    return `${formatNumber(min, locale)}+`;
  }
  return `${formatNumber(min, locale)}–${formatNumber(max, locale)}`;
}

export function formatPrice(
  price: number,
  currency: "CNY" | "USD",
  locale: string,
  condition: Condition,
  t: Translator
): string {
  let formatted: string;
  if (currency === "CNY") {
    // CNY display template lives in i18n: "{value} 元" in zh, "¥{value}" in en.
    formatted = t("cnyAmount", { value: formatNumber(price, locale) });
  } else {
    formatted = new Intl.NumberFormat(intlLocaleFor(locale), {
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
  const price = formatPrice(entry.price, entry.currency, locale, condition, t);
  const conditionLabel = t(condition === "new" ? "conditionNew" : "conditionUsed");
  return `${price} · ${entry.source} · ${entry.sampledAt} · ${conditionLabel}`;
}
