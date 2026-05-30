import type { PurchaseChannelType } from "@/lib/types";

const ALL_BRANDS = new Set([
  "7artisans", "brightinstar", "ttartisan", "viltrox", "laowa",
  "fujifilm", "sigma", "tamron", "voigtlander",
  "sgimage", "meike", "sirui",
]);

const CHANNEL_BRANDS: Record<PurchaseChannelType, Set<string>> = {
  official: new Set([
    "7artisans", "brightinstar", "ttartisan", "viltrox", "laowa",
    "sgimage", "meike", "sirui",
  ]),
  amazon: ALL_BRANDS,
  ebay: ALL_BRANDS,
  bhphoto: new Set([
    "7artisans", "brightinstar", "ttartisan", "viltrox", "laowa",
    "fujifilm", "sigma", "tamron", "voigtlander",
  ]),
};

const BRAND_PRIORITY: Record<string, PurchaseChannelType[]> = {
  "7artisans":   ["official", "amazon", "ebay", "bhphoto"],
  brightinstar:  ["official", "amazon", "ebay", "bhphoto"],
  ttartisan:     ["amazon", "official", "ebay", "bhphoto"],
  viltrox:       ["amazon", "official", "ebay", "bhphoto"],
  laowa:         ["amazon", "official", "ebay", "bhphoto"],
  fujifilm:      ["amazon", "ebay", "bhphoto"],
  sigma:         ["amazon", "ebay", "bhphoto"],
  tamron:        ["amazon", "ebay", "bhphoto"],
  voigtlander:   ["amazon", "ebay", "bhphoto"],
  sgimage:       ["amazon", "official", "ebay"],
  meike:         ["amazon", "official", "ebay"],
  sirui:         ["amazon", "official", "ebay"],
};

const DEFAULT_PRIORITY: PurchaseChannelType[] = ["amazon", "official", "ebay", "bhphoto"];

export function getChannelPriority(brand: string, _locale?: string): PurchaseChannelType[] {
  const key = brand.toLowerCase();
  const priority = BRAND_PRIORITY[key] ?? DEFAULT_PRIORITY;
  return priority.filter((ch) => CHANNEL_BRANDS[ch]?.has(key) ?? false);
}
