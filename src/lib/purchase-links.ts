import type { Lens, PurchaseChannelType } from "@/lib/types";
import { getChannelPriority } from "@/lib/purchase-channel-priority";

const EPN_CAMPAIGN_ID = "5339154376";
const EPN_TOOL_ID = "10001";

// Cap how many purchase buttons render per lens. Links are priority-ordered, so
// this keeps the top-ranked channels and drops the long tail.
const MAX_PURCHASE_LINKS = 3;

// Affiliate query param to set on a product URL, keyed by hostname (no www).
// Independent of channel — any purchase URL whose host is here gets its param.
// Amazon (tag) and the GoAffPro DTC stores (ref) live in one table; each value
// is a [key, value] pair fed straight to URLSearchParams.set.
// Single Earn Globally store ID. Every enrolled marketplace earns under this
// one tag, so all Amazon storefronts below share it.
const AMAZON_TAG = "xglass0a-20";

const AFFILIATE_PARAMS: Record<string, [string, string]> = {
  // Amazon storefronts covered by Earn Globally enrolment — all share the one
  // store ID. Storefronts not listed (amazon.com.au, amazon.co.jp) are not
  // enrolled: they still localize for the shopper but stay non-affiliate.
  "amazon.com": ["tag", AMAZON_TAG],
  "amazon.ca": ["tag", AMAZON_TAG],
  "amazon.co.uk": ["tag", AMAZON_TAG],
  "amazon.de": ["tag", AMAZON_TAG],
  "amazon.fr": ["tag", AMAZON_TAG],
  "amazon.it": ["tag", AMAZON_TAG],
  "amazon.es": ["tag", AMAZON_TAG],
  "amazon.nl": ["tag", AMAZON_TAG],
  "amazon.pl": ["tag", AMAZON_TAG],
  "amazon.se": ["tag", AMAZON_TAG],
  "7artisans.store": ["ref", "omwzyqkn"],
  "ttartisan.store": ["ref", "idncwfkb"],
  "viltrox.com": ["ref", "owbtcyuk"],
  "brightinstar.com": ["ref", "mffdqyik"],
};

interface EbayMarket {
  domain: string;
  mkrid: string;
}

const EBAY_MARKETS: Record<string, EbayMarket> = {
  US: { domain: "ebay.com", mkrid: "711-53200-19255-0" },
  GB: { domain: "ebay.co.uk", mkrid: "710-53481-19255-0" },
  AU: { domain: "ebay.com.au", mkrid: "705-53470-19255-0" },
  CA: { domain: "ebay.ca", mkrid: "706-53473-19255-0" },
  DE: { domain: "ebay.de", mkrid: "707-53477-19255-0" },
  FR: { domain: "ebay.fr", mkrid: "709-53476-19255-0" },
  IT: { domain: "ebay.it", mkrid: "724-53478-19255-0" },
  ES: { domain: "ebay.es", mkrid: "1185-53479-19255-0" },
  NL: { domain: "ebay.nl", mkrid: "1346-53482-19255-0" },
  BE: { domain: "ebay.be", mkrid: "1553-53471-19255-0" },
  AT: { domain: "ebay.at", mkrid: "5221-53469-19255-0" },
  CH: { domain: "ebay.ch", mkrid: "5222-53480-19255-0" },
  IE: { domain: "ebay.ie", mkrid: "5282-53468-19255-0" },
  PL: { domain: "ebay.pl", mkrid: "4908-226936-19255-0" },
};

const EBAY_DEFAULT_MARKET = EBAY_MARKETS.US;

// Amazon storefront domain by GeoIP country. Locale stays the master switch for
// market/currency; GeoIP only refines which Amazon marketplace an international
// (non-zh) visitor lands on. Earn-Globally storefronts carry the affiliate tag
// via AFFILIATE_PARAMS; utility-only regions (AU/JP) localize the storefront but
// stay non-affiliate. Unmapped countries fall back to amazon.com.
const AMAZON_MARKETS: Record<string, string> = {
  US: "amazon.com",
  CA: "amazon.ca",
  GB: "amazon.co.uk",
  DE: "amazon.de",
  AT: "amazon.de",
  FR: "amazon.fr",
  IT: "amazon.it",
  ES: "amazon.es",
  NL: "amazon.nl",
  PL: "amazon.pl",
  SE: "amazon.se",
  AU: "amazon.com.au",
  JP: "amazon.co.jp",
};

const AMAZON_DEFAULT_DOMAIN = "amazon.com";

const CHANNEL_LABELS: Record<PurchaseChannelType, string> = {
  official: "Official",
  amazon: "Amazon",
  ebay: "eBay",
  bhphoto: "B&H",
};

export interface PurchaseLink {
  channel: PurchaseChannelType;
  label: string;
  url: string;
  isAffiliate: boolean;
}

function getSearchQuery(lens: Lens, locale: string): string {
  if (locale === "zh" && lens.searchAliases.zh) {
    return lens.searchAliases.zh;
  }
  return lens.searchAliases.en;
}

function buildEbayUrl(
  lens: Lens,
  locale: string,
  countryCode: string,
  customId?: string,
): string {
  const market = EBAY_MARKETS[countryCode] ?? EBAY_DEFAULT_MARKET;
  const query = getSearchQuery(lens, locale);
  const target = `https://www.${market.domain}/sch/i.html?_nkw=${encodeURIComponent(query)}`;
  const params = [
    `mkevt=1`,
    `mkcid=1`,
    `mkrid=${market.mkrid}`,
    `campid=${EPN_CAMPAIGN_ID}`,
    `toolid=${EPN_TOOL_ID}`,
  ];
  if (customId) {
    params.push(`customid=${encodeURIComponent(customId)}`);
  }
  return `${target}&${params.join("&")}`;
}

function buildBhPhotoUrl(lens: Lens, locale: string): string {
  const query = getSearchQuery(lens, locale);
  return `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(query)}`;
}

// Rewrite an amazon.com product URL to the visitor's regional storefront based
// on GeoIP, keeping the same path (and thus the same ASIN). Unmapped countries
// and non-amazon hosts are returned untouched. Same-ASIN assumption: a product
// absent from the regional store may 404 rather than fall back to search —
// per-region ASINs are a future pipeline concern.
function localizeAmazonUrl(url: string, countryCode: string): string {
  const domain = AMAZON_MARKETS[countryCode] ?? AMAZON_DEFAULT_DOMAIN;
  if (domain === AMAZON_DEFAULT_DOMAIN) {
    return url;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!/(^|\.)amazon\.[a-z.]+$/.test(parsed.hostname)) {
    return url;
  }
  parsed.hostname = `www.${domain}`;
  return parsed.toString();
}

// Set the affiliate param for a product URL's host, if registered. Channel-
// agnostic: official (ref) and amazon (tag) both go through here.
function applyAffiliate(url: string): { url: string; isAffiliate: boolean } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, isAffiliate: false };
  }
  const param = AFFILIATE_PARAMS[parsed.hostname.replace(/^www\./, "")];
  if (!param) {
    return { url, isAffiliate: false };
  }
  parsed.searchParams.set(param[0], param[1]);
  return { url: parsed.toString(), isAffiliate: true };
}

export function isPurchaseLocale(locale: string): boolean {
  return locale !== "zh";
}

export function buildPurchaseLinks(
  lens: Lens,
  locale: string,
  countryCode: string,
  customId?: string,
): PurchaseLink[] {
  if (!isPurchaseLocale(locale)) {
    return [];
  }

  const market = locale === "zh" ? "cn" : "global";
  const newEntries = lens.pricing?.[market]?.new ?? [];

  // Data-driven channels: first pricing entry per channel that carries a url.
  // The array is priority-ordered (publish sorts by storefront order), so the
  // first occurrence per channel is the preferred storefront (same-channel
  // dedup).
  const urlByChannel = new Map<string, string>();
  for (const entry of newEntries) {
    if (entry.purchasableChannel && entry.url && !urlByChannel.has(entry.purchasableChannel)) {
      urlByChannel.set(entry.purchasableChannel, entry.url);
    }
  }

  const links: PurchaseLink[] = [];

  for (const channel of getChannelPriority(lens.brand, countryCode)) {
    switch (channel) {
      case "official":
      case "amazon": {
        const rawUrl = urlByChannel.get(channel);
        if (rawUrl) {
          const url =
            channel === "amazon" ? localizeAmazonUrl(rawUrl, countryCode) : rawUrl;
          const aff = applyAffiliate(url);
          links.push({
            channel,
            label: CHANNEL_LABELS[channel],
            url: aff.url,
            isAffiliate: aff.isAffiliate,
          });
        }
        break;
      }
      case "ebay":
        links.push({
          channel: "ebay",
          label: CHANNEL_LABELS.ebay,
          url: buildEbayUrl(lens, locale, countryCode, customId),
          isAffiliate: true,
        });
        break;
      case "bhphoto":
        links.push({
          channel: "bhphoto",
          label: CHANNEL_LABELS.bhphoto,
          url: buildBhPhotoUrl(lens, locale),
          isAffiliate: false,
        });
        break;
    }
  }

  return links.slice(0, MAX_PURCHASE_LINKS);
}
