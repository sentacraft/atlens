/**
 * Brand-official shop search URLs for the lens detail page's
 * Where-to-buy entry.
 *
 * The data lives in src/data/brand-shops.json — currently hand-derived from
 * x-glass-pipeline/shop-links.yaml; once the pipeline publish step automates
 * emission of this file, brand-shops.json becomes pipeline-owned and this
 * module stays unchanged.
 *
 * Per market, only the first entry is exposed for now — the UI shows one
 * button per market. Multi-channel rendering (e.g. JD + Tmall side by side)
 * is a future UX decision.
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
  url: string;
}

function buildUrl(template: string, brandName: string, model: string): string {
  const query = encodeURIComponent(`${brandName} ${model}`);
  return template.replace(/\{q\}/g, query);
}

export function getShopLinks(lens: Lens): ShopLink[] {
  const channels = SHOP_DATA[lens.brand];
  if (!channels || typeof channels === "string") {
    return [];
  }

  const links: ShopLink[] = [];

  const cnFirst = channels.cn?.[0];
  const cnBrand = ZH_BRAND_NAMES[lens.brand];
  if (cnFirst && cnBrand) {
    links.push({ market: "cn", url: buildUrl(cnFirst.search_url, cnBrand, lens.model) });
  }

  const globalFirst = channels.global?.[0];
  const globalBrand = EN_BRAND_NAMES[lens.brand];
  if (globalFirst && globalBrand) {
    links.push({ market: "global", url: buildUrl(globalFirst.search_url, globalBrand, lens.model) });
  }

  return links;
}
