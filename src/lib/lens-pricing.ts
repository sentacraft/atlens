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

// Source labels emphasize whether the price comes from an official storefront
// or a second-hand marketplace, so users can judge reliability at a glance.
const SOURCE_LABELS: Record<string, Record<string, string>> = {
  zh: {
    jd: "官方店（京东）",
    tmall: "官方店（天猫）",
    xianyu: "闲鱼",
  },
  en: {
    jd: "Official store (JD.com)",
    tmall: "Official store (Tmall)",
    xianyu: "Xianyu",
  },
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
