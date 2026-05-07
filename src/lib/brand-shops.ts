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
 * Search query is constructed from structured Lens fields (whitelist),
 * uniformly for all brands:
 *     [AF if af] <focal>mm f<maxAperture>
 * For cine lenses where maxAperture is null, fall back to maxTStop with a
 * "T" prefix. For variable-aperture zooms, the two ends are space-separated
 * (not dash):
 *     prime cine    "MF 12mm T2.9 APS-C Cine"      → "12mm T2.9"
 *     prime         "MF 4mm F2.8"                  → "4mm f2.8"
 *     prime         "AF 25mm F1.8 LITE"            → "AF 25mm f1.8"
 *     zoom variable "AF 18-300mm F/3.5-6.3"        → "AF 18-300mm f3.5 6.3"
 *     fuji prime    "XF 35mm F1.4 R"               → "AF 35mm f1.4"
 *     tamron zoom   "11-20mm F/2.8 Di III-A RXD"   → "AF 11-20mm f2.8"
 *
 * Trade-offs accepted:
 *   - Variant suffixes (LITE / PRO / Macro / WR) and generation markers
 *     (II / III) are dropped. When two SKUs share focal/aperture/af, both
 *     appear in the result list and the user picks. Empirically safer
 *     than including the marker — JP retail listings drop "MF" and
 *     fuzzy-match badly when forced to include the model verbatim.
 *   - The brand name is NOT prepended; each search_url already targets a
 *     brand-official store. ASCII-only queries also sidestep Tmall's
 *     GBK/UTF-8 decoding ambiguity for non-ASCII text.
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

function formatStop(value: number | [number, number], prefix: string): string {
  return Array.isArray(value)
    ? `${prefix}${value[0]} ${value[1]}`
    : `${prefix}${value}`;
}

function buildSearchQuery(lens: Lens): string {
  const focal =
    lens.focalLengthMin === lens.focalLengthMax
      ? `${lens.focalLengthMin}mm`
      : `${lens.focalLengthMin}-${lens.focalLengthMax}mm`;
  // Prefer F-stop; fall back to T-stop for cine lenses where maxAperture is null.
  const stop =
    lens.maxAperture != null
      ? formatStop(lens.maxAperture, "f")
      : lens.maxTStop != null
        ? formatStop(lens.maxTStop, "T")
        : null;
  return [lens.af ? "AF" : null, focal, stop].filter(Boolean).join(" ");
}

function buildUrl(template: string, lens: Lens): string {
  return template.replace(/\{q\}/g, encodeURIComponent(buildSearchQuery(lens)));
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
    url: buildUrl(entry.search_url, lens),
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
