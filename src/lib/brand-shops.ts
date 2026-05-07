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
 *
 * Search query is derived from `lens.model` with two transforms calibrated
 * against JD store-search recall (verified on 七工匠's JD store):
 *   - Strip leading "MF " — manual-focus lenses on retail listings never
 *     get the "MF" tag (it's the implicit default), so requiring "MF" as a
 *     query token forces JD into a fuzzy fallback that misfires badly.
 *   - "AF " is intentionally kept — autofocus lenses do get the "AF" tag,
 *     and keeping it cleanly disambiguates the AF SKU from any MF sibling
 *     of the same focal/aperture (a real situation for 7artisans /
 *     brightinstar / sgimage et al).
 *   - "F<digit>" → "<digit>" — JD listings render aperture as "f2.8"
 *     (lowercase, sometimes joined like "AF25mmF1.8"), and JD's tokenizer
 *     treats "F2.8" as two tokens "F" + "2.8" that fail to match the
 *     compound. Dropping the "F" lets the bare numeric token substring-
 *     match across all rendering variants.
 *
 * Trade-off: an MF lens detail page may surface both MF and AF siblings in
 * the search result list (since the query lacks the differentiator). The
 * user can pick. This is acceptable vs. the alternatives (0 results or
 * wrong product).
 *
 * Brand name is NOT included in the query: each search_url already targets
 * a brand-official store. Including a CJK brand prefix would also reignite
 * Tmall's GBK/UTF-8 decoding ambiguity for non-ASCII queries; ASCII-only
 * queries sidestep it entirely.
 */

import type { Lens } from "@/lib/types";
import shopData from "@/data/brand-shops.json";

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

export interface ShopLink {
  market: "cn" | "global";
  kind: string;
  region?: string;
  url: string;
}

function normalizeForSearch(model: string): string {
  return model
    .replace(/^MF\s+/, "")
    .replace(/\bF(\d)/g, "$1");
}

function buildUrl(template: string, model: string): string {
  return template.replace(/\{q\}/g, encodeURIComponent(normalizeForSearch(model)));
}

function expandMarket(
  market: "cn" | "global",
  entries: ChannelEntry[] | undefined,
  lens: Lens,
): ShopLink[] {
  if (!entries) {
    return [];
  }
  return entries.map((entry) => ({
    market,
    kind: entry.kind,
    region: entry.region,
    url: buildUrl(entry.search_url, lens.model),
  }));
}

export function getShopLinks(lens: Lens): ShopLink[] {
  const channels = SHOP_DATA[lens.brand];
  if (!channels || typeof channels === "string") {
    return [];
  }
  return [
    ...expandMarket("cn", channels.cn, lens),
    ...expandMarket("global", channels.global, lens),
  ];
}
