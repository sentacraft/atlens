import "server-only";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { routing } from "@/i18n/routing";
import { CATALOG_COVERAGE, type CoverageState } from "@/lib/lens/catalog-coverage";
import { getLensesByMount, lensCountsByBrand, meta } from "@/lib/lens/data";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { priceMarket, type Market } from "@/lib/lens/pricing";
import { isPurchaseLocale } from "@/lib/purchase/links";
import { donationChannel } from "@/lib/support";
import { MOUNTS, type Lens, type LensPriceEntry } from "@/lib/types";
import { HANDWRITTEN_FACTS } from "@/lib/site-facts/handwritten";

export const SITE_TOPICS = ["project", "business", "data", "prices", "askIris", "account", "privacy", "usage"] as const;
export type SiteTopic = (typeof SITE_TOPICS)[number];

type Messages = typeof en;
const MESSAGES: Record<string, Messages> = { en, zh };
const languageName = (code: string) => new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;

/** Replaces each `{Namespace.key}` with that message, leaving an unknown key as written. */
function uiStrings(text: string, messages: Messages): string {
  return text.replace(/\{(\w+)\.(\w+)\}/g, (placeholder, namespace: string, key: string) => {
    const value = (messages as Record<string, Record<string, unknown>>)[namespace]?.[key];
    return typeof value === "string" ? value : placeholder;
  });
}

function list(items: string[]): string {
  return items.join(", ");
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
  return [en.About.coverageBody, ...perMount, `The lens data was last updated on ${meta.lastUpdated.slice(0, 10)}.`];
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
  const channel = donationChannel(locale) === "wechat" ? m.About.donationWechatLabel : "Ko-fi";
  return [
    `Visitors who want to support Atlens can tip with ${channel}, from the "${m.About.supportTitle}" section of the "${m.Nav.about}" page.`,
    `Store links on this site: ${isPurchaseLocale(locale) ? en.Purchase.disclosureDetail : en.Purchase.disclosureNoAffiliate}`,
  ];
}

function accountFeatures(locale: string): string[] {
  const auth = MESSAGES[locale].Auth;
  return [
    `Browsing, comparing, and Ask Iris all work without an account. Signing in adds: ${[auth.benefitGear, auth.benefitFavorites, auth.benefitSync].join("; ")}`,
  ];
}

function features(locale: string): string[] {
  const m = MESSAGES[locale];
  const named = (label: string, what: string) => `"${label}": ${what}`;
  return [
    `Main features and their names on the site: ${list([
      named(m.Nav.lenses, "browse and filter every lens of the current mount"),
      named(m.Nav.collections, "curated lens lists by theme"),
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
    `There is no app-store app. Atlens can be installed as a web app (PWA) on a phone or computer from the "${m.Nav.getApp}" page in the site's navigation.`,
  ];
}

const GENERATED: Partial<Record<SiteTopic, (locale: string) => string[]>> = {
  business: commercialTies,
  data: coverage,
  prices: priceSources,
  account: accountFeatures,
  usage: features,
};

/** What Iris may tell anyone about Atlens itself, for the given topics. */
export function siteFacts(topics: SiteTopic[], locale: string): { topic: SiteTopic; facts: string[] }[] {
  const messagesLocale = locale in MESSAGES ? locale : routing.defaultLocale;
  return [...new Set(topics)].map((topic) => ({
    topic,
    facts: [
      ...HANDWRITTEN_FACTS.filter((fact) => fact.topic === topic).map((fact) =>
        uiStrings(fact.text, MESSAGES[messagesLocale]),
      ),
      ...(GENERATED[topic]?.(messagesLocale) ?? []),
    ],
  }));
}
