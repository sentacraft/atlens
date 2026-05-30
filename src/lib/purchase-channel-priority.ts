import type { PurchaseChannelType } from "@/lib/types";

// Per-brand channel display order (which channels to show + in what order).
// Data-driven channels (official/amazon) only render when the lens's pricing
// actually carries that channel; search-driven channels (ebay/bhphoto) always
// render when listed here. Rationale: Obsidian affiliate-channel-registry.md.
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

export function getChannelPriority(brand: string): PurchaseChannelType[] {
  return BRAND_PRIORITY[brand.toLowerCase()] ?? DEFAULT_PRIORITY;
}
