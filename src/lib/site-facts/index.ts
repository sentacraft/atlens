import "server-only";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { routing } from "@/i18n/routing";
import { brandLink, chartLink, collectionLink, factLinkMarkdown, type FactLink } from "@/lib/askiris/inline-links";
import { BRANDS, getBrandLenses } from "@/lib/brands";
import { COLLECTIONS } from "@/lib/collections";
import { CATALOG_COVERAGE, type CoverageState } from "@/lib/lens/catalog-coverage";
import { getLensesByMount, lensCountsByBrand, meta } from "@/lib/lens/data";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { mountHasCharts, mountHasCollections } from "@/lib/mount";
import { priceMarket, type Market } from "@/lib/lens/pricing";
import { isPurchaseLocale } from "@/lib/purchase/links";
import { donationChannels } from "@/lib/support";
import { MOUNTS, type Lens, type LensPriceEntry, type Mount } from "@/lib/types";
import { HANDWRITTEN_FACTS } from "@/lib/site-facts/handwritten";
import { fillUiStrings } from "@/lib/ui-strings";

export const SITE_TOPICS = [
  "project",
  "story",
  "business",
  "data",
  "prices",
  "askIris",
  "account",
  "privacy",
  "usage",
  "collections",
  "brands",
  "charts",
] as const;
export type SiteTopic = (typeof SITE_TOPICS)[number];

// zh's JSON import keeps plain string types; en's generated declaration has literal ones.
type Messages = typeof zh;
const MESSAGES: Record<string, Messages> = { en, zh };
const languageName = (code: string) => new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;

function list(items: string[]): string {
  return items.join(", ");
}

function withLinks(locale: string, text: string, links: FactLink[] = []): string {
  if (links.length === 0) {
    return text;
  }
  return `${text} (links: ${links.map((l) => fillUiStrings(factLinkMarkdown(l), locale)).join(", ")})`;
}

const COVERAGE_STATE: Record<string, string> = {
  true: "covered",
  partial: "partly covered",
  planned: "under evaluation",
  false: "not planned",
  "n/a": "not applicable",
};

function coverage(locale: string): string[] {
  const brands = MESSAGES[locale].Brands as Record<string, string>;
  const perMount = MOUNTS.map((mount) => {
    const counts = lensCountsByBrand(mount, locale);
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const state = (value: CoverageState) => COVERAGE_STATE[String(value)];
    const byBrand = Object.entries(CATALOG_COVERAGE[mount]).map(
      ([brand, c]) =>
        `${brands[brand] ?? brand}: ${counts[brand] ?? 0} lenses; current lenses ${state(c.active)}, discontinued ${state(c.discontinued)}, cinema ${state(c.cinema)}`,
    );
    return `${mount} mount, ${total} lenses in all. ${byBrand.join(". ")}.`;
  });
  return [withLinks(locale, en.About.coverageBody, ["page:aboutCoverage"]), ...perMount, `The lens data was last updated on ${meta.lastUpdated.slice(0, 10)}.`];
}

function sourcesOf(lenses: Lens[], market: Market, condition: "new" | "used"): string[] {
  const names = new Set<string>();
  for (const lens of lenses) {
    const entries = lens.pricing?.[market]?.[condition];
    for (const entry of ([] as LensPriceEntry[]).concat(entries ?? [])) {
      names.add(entry.source.split("·")[0]);
    }
  }
  return [...names];
}

function priceSources(locale: string): string[] {
  const lenses = MOUNTS.flatMap((mount) => getLensesByMount(mount, locale));
  const market = priceMarket(locale);
  return [`Prices on this site: new from ${list(sourcesOf(lenses, market, "new"))}; used from ${list(sourcesOf(lenses, market, "used"))}.`];
}

function commercialTies(locale: string): string[] {
  const m = MESSAGES[locale];
  const channels = donationChannels(locale).map((channel) => (channel === "wechat" ? m.Support.wechatTitle : "Ko-fi"));
  return [
    withLinks(
      locale,
      `Visitors who want to support Atlens can tip with ${channels.join(" or ")}, from "${m.Nav.support}" in the site menu or the "${m.About.supportTitle}" section of the "${m.Nav.about}" page.`,
      ["page:aboutSupport"],
    ),
    `Store links on this site: ${isPurchaseLocale(locale) ? en.Purchase.disclosureDetail : en.Purchase.disclosureNoAffiliate}`,
  ];
}

function accountFeatures(locale: string): string[] {
  const auth = MESSAGES[locale].Auth;
  return [
    withLinks(
      locale,
      `Browsing, comparing, and Ask Iris all work without an account. Signing in adds: ${[auth.benefitGear, auth.benefitFavorites, auth.benefitChats].join("; ")}`,
      ["action:signIn", "page:profileFavorites", "page:profileGear"],
    ),
  ];
}

function features(locale: string): string[] {
  const m = MESSAGES[locale];
  const named = (label: string, what: string) => `"${label}": ${what}`;
  return [
    `Main features and their names on the site: ${list([
      named(m.Nav.lenses, "browse and filter every lens of the current mount"),
      named(m.Nav.collections, "curated lens lists by theme"),
      named(m.Nav.charts, "release timeline, weight ladder and lineups, across brands"),
      named(m.Nav.compare, `compare up to ${MAX_COMPARE} lenses spec by spec`),
      named(m.Nav.askIris, "chat with Iris to choose lenses"),
      named(m.RecentlyAdded.pageTitle, "lenses added to the data, by date"),
      named(m.Profile.favoritesTitle, "lenses the user saved; needs an account"),
      named(m.Profile.gearTitle, "the bodies and lenses the user owns, which Iris takes into account; needs an account"),
      named(m.Share.button, "share a lens or a comparison as a link or a poster image"),
      named(m.Nav.feedback, "report a data problem or send an idea"),
      named(m.Nav.getApp, "install Atlens as a web app"),
    ])}.`,
    `The site is available in ${list(routing.locales.map(languageName))}.`,
    withLinks(
      locale,
      `There is no app-store app. Atlens can be installed as a web app (PWA) on a phone or computer from the "${m.Nav.getApp}" page in the site's navigation.`,
      ["page:getApp"],
    ),
  ];
}

function collections(locale: string, mount: Mount): string[] {
  const m = MESSAGES[locale];
  if (!mountHasCollections(mount)) {
    return [`"${m.Nav.collections}" are not available for the current mount yet.`];
  }
  const lang = locale === "zh" ? "zh" : "en";
  return [
    `"${m.Nav.collections}" are curated lens lists by theme, for the current mount. Each line: a link to the collection, then its summary.`,
    ...Object.values(COLLECTIONS).map(
      (c) => `[${c.title[lang]}](${collectionLink(c.slug)}): ${c.shortDescription[lang]}`,
    ),
  ];
}

function brands(locale: string, mount: Mount): string[] {
  if (!mountHasCollections(mount)) {
    return ["Brand pages are not available for the current mount yet."];
  }
  const names = MESSAGES[locale].Brands as Record<string, string>;
  const lang = locale === "zh" ? "zh" : "en";
  const lenses = getLensesByMount(mount, locale);
  return [
    "Each brand has a page with every photo lens it makes for the current mount: its lineup by focal length, its release timeline where years are known, and the full list. Each line: a link to the brand page, its lens count, then its summary.",
    ...BRANDS.map(
      (b) => `[${names[b.slug] ?? b.slug}](${brandLink(b.slug)}): ${getBrandLenses(lenses, b.slug).length} lenses. ${b.shortDescription[lang]}`,
    ),
  ];
}

function charts(locale: string, mount: Mount): string[] {
  const m = MESSAGES[locale];
  if (!mountHasCharts(mount)) {
    return [`"${m.Nav.charts}" are not available for the current mount yet.`];
  }
  return [
    `"${m.Nav.charts}" draw every brand's photo lenses together; cinema lenses are left out. Each line: a link to the chart, then what it shows.`,
    `[${m.Charts.tabTimeline}](${chartLink("timeline")}): each lens by release year and focal length; a brand can be highlighted.`,
    `[${m.Charts.tabWeight}](${chartLink("weight")}): every lens ranked heaviest to lightest in five tiers, with everyday things of known weight set among them; filterable by brand.`,
    `[${m.Charts.tabLineup}](${chartLink("lineups")}): each brand's lenses side by side by focal length.`,
    "A lens page links its weight to the weight ladder and its release year to the timeline, each opened on that lens.",
  ];
}

const GENERATED: Partial<Record<SiteTopic, (locale: string, mount: Mount) => string[]>> = {
  business: commercialTies,
  data: coverage,
  prices: priceSources,
  account: accountFeatures,
  usage: features,
  collections,
  brands,
  charts,
};

/** What Iris may tell anyone about Atlens itself, for the given topics. */
export function siteFacts(topics: SiteTopic[], locale: string, mount: Mount): { topic: SiteTopic; facts: string[] }[] {
  const messagesLocale = locale in MESSAGES ? locale : routing.defaultLocale;
  return [...new Set(topics)].map((topic) => ({
    topic,
    facts: [
      ...HANDWRITTEN_FACTS.filter((fact) => fact.topic === topic).map((fact) =>
        withLinks(messagesLocale, fillUiStrings(fact.text, messagesLocale), fact.links),
      ),
      ...(GENERATED[topic]?.(messagesLocale, mount) ?? []),
    ],
  }));
}
