import type { PurchaseChannel } from "@/lib/types";

type ChannelType = PurchaseChannel["channel"];

const BRAND_PRIORITY: Record<string, ChannelType[]> = {
  "7artisans": ["official", "amazon", "ebay", "bhphoto"],
  brightinstar: ["official", "amazon", "ebay", "bhphoto"],
  ttartisan: ["amazon", "official", "ebay", "bhphoto"],
  viltrox: ["amazon", "official", "ebay", "bhphoto"],
  laowa: ["amazon", "official", "ebay", "bhphoto"],
  fujifilm: ["amazon", "ebay", "bhphoto"],
  sigma: ["amazon", "ebay", "bhphoto"],
  tamron: ["amazon", "ebay", "bhphoto"],
  voigtlander: ["amazon", "ebay", "bhphoto"],
  sgimage: ["amazon", "official", "ebay"],
  meike: ["amazon", "official", "ebay"],
  sirui: ["amazon", "official", "ebay"],
};

const DEFAULT_PRIORITY: ChannelType[] = ["amazon", "official", "ebay", "bhphoto"];

export function sortPurchaseChannels(
  channels: PurchaseChannel[],
  brand: string,
): PurchaseChannel[] {
  const priority = BRAND_PRIORITY[brand.toLowerCase()] ?? DEFAULT_PRIORITY;
  return [...channels].sort((a, b) => {
    const ai = priority.indexOf(a.channel);
    const bi = priority.indexOf(b.channel);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
