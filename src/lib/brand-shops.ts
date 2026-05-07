/**
 * Brand-official shop search URLs for the lens detail page's
 * Where-to-buy entry.
 *
 * The data lives in src/data/brand-shops.json — currently hand-derived from
 * x-glass-pipeline/shop-links.yaml; once the pipeline publish step automates
 * emission of this file, brand-shops.json becomes pipeline-owned and this
 * module stays unchanged.
 *
 * Currently every channel entry is exposed as its own button (debug mode —
 * surfacing all sources for evaluation). Quality-based filtering / merging
 * happens later, before re-enabling auto-deploy.
 */

import type { Lens } from "@/lib/types";
import shopData from "@/data/brand-shops.json";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

interface ChannelEntry {
  kind: string;
  search_url: string;
  region?: string;
}

interface BrandChannels {
  cn?: ChannelEntry[];
  global?: ChannelEntry[];
}

const SHOP_DATA = shopData as Record<string, BrandChannels | string>;
const EN_BRAND_NAMES = enMessages.Brands as Record<string, string>;
const ZH_BRAND_NAMES = zhMessages.Brands as Record<string, string>;

export interface ShopLink {
  market: "cn" | "global";
  kind: string;
  region?: string;
  url: string;
}

function buildUrl(template: string, brandName: string, model: string): string {
  const query = encodeURIComponent(`${brandName} ${model}`);
  return template.replace(/\{q\}/g, query);
}

function expandMarket(
  market: "cn" | "global",
  entries: ChannelEntry[] | undefined,
  brandName: string | undefined,
  lens: Lens,
): ShopLink[] {
  if (!entries || !brandName) {
    return [];
  }
  return entries.map((entry) => ({
    market,
    kind: entry.kind,
    region: entry.region,
    url: buildUrl(entry.search_url, brandName, lens.model),
  }));
}

export function getShopLinks(lens: Lens): ShopLink[] {
  const channels = SHOP_DATA[lens.brand];
  if (!channels || typeof channels === "string") {
    return [];
  }
  return [
    ...expandMarket("cn", channels.cn, ZH_BRAND_NAMES[lens.brand], lens),
    ...expandMarket("global", channels.global, EN_BRAND_NAMES[lens.brand], lens),
  ];
}
