import type { Lens } from "@/lib/types";
import { sortPurchaseChannels } from "@/lib/purchase-channel-priority";

const AMAZON_TAG = "xglass0a-20";
const EPN_CAMPAIGN_ID = "5339154376";
const EPN_TOOL_ID = "10001";

const DOMAIN_AFFILIATES: Record<string, string> = {
  "7artisans.store": "ref=omwzyqkn",
  "ttartisan.store": "ref=idncwfkb",
  "viltrox.com": "ref=owbtcyuk",
  "brightinstar.com": "ref=mffdqyik",
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

export interface PurchaseLink {
  channel: "official" | "amazon" | "ebay" | "bhphoto";
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

function buildAmazonUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}/?tag=${AMAZON_TAG}`;
}

function buildBhPhotoUrl(lens: Lens, locale: string): string {
  const query = getSearchQuery(lens, locale);
  return `https://www.bhphotovideo.com/c/search?Ntt=${encodeURIComponent(query)}`;
}


function getAffiliateParam(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_AFFILIATES[hostname];
  } catch {
    return undefined;
  }
}

function buildOfficialUrl(url: string): { url: string; isAffiliate: boolean } {
  const param = getAffiliateParam(url);
  if (!param) {
    return { url, isAffiliate: false };
  }
  const sep = url.includes("?") ? "&" : "?";
  return { url: `${url}${sep}${param}`, isAffiliate: true };
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
  if (!isPurchaseLocale(locale) || !lens.purchaseChannels) {
    return [];
  }

  const sorted = sortPurchaseChannels(lens.purchaseChannels, lens.brand);
  const links: PurchaseLink[] = [];

  for (const ch of sorted) {
    switch (ch.channel) {
      case "official":
        if (ch.url) {
          const official = buildOfficialUrl(ch.url);
          links.push({
            channel: "official",
            label: "Official",
            url: official.url,
            isAffiliate: official.isAffiliate,
          });
        }
        break;
      case "amazon":
        if (ch.asin) {
          links.push({
            channel: "amazon",
            label: "Amazon",
            url: buildAmazonUrl(ch.asin),
            isAffiliate: true,
          });
        }
        break;
      case "ebay":
        links.push({
          channel: "ebay",
          label: "eBay",
          url: buildEbayUrl(lens, locale, countryCode, customId),
          isAffiliate: true,
        });
        break;
      case "bhphoto":
        links.push({
          channel: "bhphoto",
          label: "B&H",
          url: buildBhPhotoUrl(lens, locale),
          isAffiliate: false,
        });
        break;
    }
  }

  return links;
}
