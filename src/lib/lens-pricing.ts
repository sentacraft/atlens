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
  if (bucket?.new) {return { entry: bucket.new, market, condition: "new" };}
  if (bucket?.used) {return { entry: bucket.used, market, condition: "used" };}
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

export function formatPrice(
  price: number,
  currency: "CNY" | "USD",
  locale: string,
  condition: Condition
): string {
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  const formatted = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
  return condition === "used" ? `~${formatted}` : formatted;
}

export function formatTierRange(
  tier: 1 | 2 | 3 | 4 | 5,
  currency: "CNY" | "USD",
  locale: string
): string {
  const { min, max } = tierRange(tier, currency);
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
  const fmt = (n: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (max === null) {return `${fmt(min)}+`;}
  return `${fmt(min)} – ${fmt(max)}`;
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

const SOURCE_LABELS: Record<string, Record<string, string>> = {
  zh: { jd: "京东", tmall: "天猫", xianyu: "闲鱼" },
  en: { jd: "JD.com", tmall: "Tmall", xianyu: "Xianyu" },
};

export function formatSource(source: string, locale: string): string {
  const map = SOURCE_LABELS[locale === "zh" ? "zh" : "en"];
  return map[source] ?? source;
}

export function formatPriceForReport(selection: PriceSelection, locale: string): string {
  const { entry, condition } = selection;
  const price = formatPrice(entry.price, entry.currency, locale, condition);
  const source = formatSource(entry.source, locale);
  const conditionLabel =
    condition === "new"
      ? locale === "zh" ? "新品" : "New"
      : locale === "zh" ? "二手" : "Used";
  return `${price} · ${source} · ${entry.sampledAt} · ${conditionLabel}`;
}
