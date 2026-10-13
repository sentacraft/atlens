import type { PurchaseChannelType } from "@/lib/types";

// Rationale: Obsidian affiliate-channel-registry.md.
const BRAND_PRIORITY: Record<string, PurchaseChannelType[]> = {
  "7artisans":  ["official", "amazon", "ebay", "bhphoto"],
  brightinstar: ["official", "amazon", "ebay", "bhphoto"],
  ttartisan:    ["amazon", "official", "ebay", "bhphoto"],
  viltrox:      ["amazon", "official", "ebay", "bhphoto"],
  laowa:        ["amazon", "official", "ebay", "bhphoto"],
  fujifilm:     ["amazon", "ebay", "bhphoto"],
  sigma:        ["amazon", "ebay", "bhphoto"],
  tamron:       ["amazon", "ebay", "bhphoto"],
  voigtlander:  ["amazon", "ebay", "bhphoto"],
  sgimage:      ["amazon", "official", "ebay"],
  meike:        ["amazon", "official", "ebay"],
  sirui:        ["amazon", "official", "ebay"],
};

const DEFAULT_PRIORITY: PurchaseChannelType[] = ["amazon", "official", "ebay", "bhphoto"];

// Affiliate status never changes the order. B&H drops to last outside the US: international
// shipping is slow and costly.
export function getChannelPriority(
  brand: string,
  countryCode: string,
): PurchaseChannelType[] {
  const base = BRAND_PRIORITY[brand.toLowerCase()] ?? DEFAULT_PRIORITY;
  if (countryCode !== "US" && base.includes("bhphoto")) {
    return [...base.filter((channel) => channel !== "bhphoto"), "bhphoto"];
  }
  return base;
}
