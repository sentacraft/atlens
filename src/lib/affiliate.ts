import type { Lens } from "@/lib/types";

const EPN_CAMPAIGN_ID = "5339154376";
const EPN_TOOL_ID = "10001";

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

export type AffiliatePlatform = "ebay";

export interface AffiliateLink {
  platform: AffiliatePlatform;
  label: string;
  url: string;
}

function getSearchQuery(lens: Lens, locale: string): string {
  const alias = locale === "zh"
    ? lens.searchAliases?.zh
    : lens.searchAliases?.en;
  return alias ?? `${lens.brand} ${lens.model}`;
}

export function buildEbayUrl(
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

export function buildAffiliateLinks(
  lens: Lens,
  locale: string,
  countryCode: string,
  customId?: string,
): AffiliateLink[] {
  if (locale === "zh") {
    return [];
  }
  return [
    {
      platform: "ebay",
      label: "eBay",
      url: buildEbayUrl(lens, locale, countryCode, customId),
    },
  ];
}

export const COUNTRY_COOKIE = "xg_country";

export function readCountryCookie(): string {
  if (typeof document === "undefined") {
    return "US";
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([^;]*)`),
  );
  return match?.[1] ?? "US";
}
