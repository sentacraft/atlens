import type { Lens, PurchaseChannelType } from "@/lib/types";
import { getChannelPriority } from "@/lib/purchase/channel-priority";

const EPN_CAMPAIGN_ID = "5339154376";
const EPN_TOOL_ID = "10001";

const MAX_PURCHASE_LINKS = 3;

// Keyed by hostname. One Amazon tracking ID covers every Earn Globally storefront.
const AMAZON_TAG = "atlens-20";

const AFFILIATE_PARAMS: Record<string, [string, string]> = {
  // amazon.com.au and amazon.co.jp are not enrolled, so they stay non-affiliate.
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

// Locale picks the market; GeoIP only picks the Amazon storefront for non-zh visitors.
// Countries without an enrolled store route to an enrolled neighbour (AT→.de, IE→.co.uk, BE→.nl).
const AMAZON_MARKETS: Record<string, string> = {
  US: "amazon.com",
  CA: "amazon.ca",
  GB: "amazon.co.uk",
  IE: "amazon.co.uk",
  DE: "amazon.de",
  AT: "amazon.de",
  FR: "amazon.fr",
  BE: "amazon.nl",
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
  // Only rendered under zh.
  jd: "京东",
  taobao: "淘宝",
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

// No affiliate program here: JD/Taobao promotion requires an ICP-registered site. Phones get
// the mobile H5 domains so the platforms hand off to their apps.
function buildJdUrl(lens: Lens, isMobileDevice: boolean): string {
  const query = encodeURIComponent(getSearchQuery(lens, "zh"));
  return isMobileDevice
    ? `https://so.m.jd.com/ware/search.action?keyword=${query}`
    : `https://search.jd.com/Search?keyword=${query}&enc=utf-8`;
}

function buildTaobaoUrl(lens: Lens, isMobileDevice: boolean): string {
  const query = encodeURIComponent(getSearchQuery(lens, "zh"));
  return isMobileDevice
    ? `https://main.m.taobao.com/search/index.html?q=${query}`
    : `https://s.taobao.com/search?q=${query}`;
}

function buildCnSearchLinks(lens: Lens, isMobileDevice: boolean): PurchaseLink[] {
  return [
    { channel: "jd", label: CHANNEL_LABELS.jd, url: buildJdUrl(lens, isMobileDevice), isAffiliate: false },
    { channel: "taobao", label: CHANNEL_LABELS.taobao, url: buildTaobaoUrl(lens, isMobileDevice), isAffiliate: false },
  ];
}

function extractAsin(url: string): string | null {
  const match = url.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/);
  return match ? match[1] : null;
}

// Outside amazon.com the US ASIN often does not exist, so other storefronts search by name.
function buildAmazonUrl(
  lens: Lens,
  locale: string,
  countryCode: string,
  sourceUrl: string,
): string {
  const domain = AMAZON_MARKETS[countryCode] ?? AMAZON_DEFAULT_DOMAIN;
  if (domain === AMAZON_DEFAULT_DOMAIN) {
    const asin = extractAsin(sourceUrl);
    return asin ? `https://www.${domain}/dp/${asin}` : sourceUrl;
  }
  const query = getSearchQuery(lens, locale);
  return `https://www.${domain}/s?k=${encodeURIComponent(query)}`;
}

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

// zh renders JD/Taobao links but earns nothing from them.
export function isPurchaseLocale(locale: string): boolean {
  return locale !== "zh";
}

export function purchaseDisclosureKey(
  locale: string,
): "disclosureDetail" | "disclosureNoAffiliate" {
  return locale === "zh" ? "disclosureNoAffiliate" : "disclosureDetail";
}

export function shouldShowDisclosure(
  hasLinks: boolean,
  hasAffiliate: boolean,
  locale: string,
): boolean {
  return hasLinks && (locale === "zh" || hasAffiliate);
}

export function buildPurchaseLinks(
  lens: Lens,
  locale: string,
  countryCode: string,
  customId?: string,
  isMobileDevice = false,
): PurchaseLink[] {
  if (locale === "zh") {
    return buildCnSearchLinks(lens, isMobileDevice);
  }

  const newEntries = lens.pricing?.global?.new ?? [];

  // Pricing is priority-ordered, so the first entry per channel wins.
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
            channel === "amazon"
              ? buildAmazonUrl(lens, locale, countryCode, rawUrl)
              : rawUrl;
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
