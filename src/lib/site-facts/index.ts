import "server-only";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { routing } from "@/i18n/routing";
import { getLensesByMount, meta } from "@/lib/lens/data";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { AFFILIATE_HOSTS } from "@/lib/purchase/links";
import { MOUNTS, type Lens, type LensPriceEntry } from "@/lib/types";
import { HANDWRITTEN_FACTS } from "@/lib/site-facts/handwritten";

export const SITE_TOPICS = ["project", "business", "data", "prices", "askIris", "account", "privacy", "usage"] as const;
export type SiteTopic = (typeof SITE_TOPICS)[number];

type Messages = typeof en;
const MESSAGES: Record<string, Messages> = { en, zh };
const LANGUAGE_NAMES: Record<string, string> = { en: "English", zh: "Simplified Chinese" };

function list(items: string[]): string {
  return items.join(", ");
}

function coverage(locale: string): string[] {
  const brands = MESSAGES[locale].Brands as Record<string, string>;
  const perMount = MOUNTS.map((mount) => {
    const lenses = getLensesByMount(mount, locale);
    const counts = new Map<string, number>();
    for (const lens of lenses) {
      counts.set(lens.brand, (counts.get(lens.brand) ?? 0) + 1);
    }
    const byBrand = [...counts].sort((a, b) => b[1] - a[1]).map(([brand, n]) => `${brands[brand] ?? brand} ${n}`);
    return `${mount} mount: ${lenses.length} lenses from ${counts.size} brands (${list(byBrand)}).`;
  });
  return [...perMount, `The lens data was last updated on ${meta.lastUpdated.slice(0, 10)}.`];
}

function sourcesOf(lenses: Lens[], market: "cn" | "global", condition: "new" | "used"): string[] {
  const names = new Set<string>();
  for (const lens of lenses) {
    const entries = lens.pricing?.[market]?.[condition];
    for (const entry of ([] as LensPriceEntry[]).concat(entries ?? [])) {
      names.add(entry.source.split("·")[0]);
    }
  }
  return [...names];
}

function priceSources(): string[] {
  const lenses = MOUNTS.flatMap((mount) => getLensesByMount(mount, "en"));
  return [
    `Chinese site prices: new from ${list(sourcesOf(lenses, "cn", "new"))}; used from ${list(sourcesOf(lenses, "cn", "used"))}.`,
    `English site prices: new from ${list(sourcesOf(lenses, "global", "new"))}; used from ${list(sourcesOf(lenses, "global", "used"))}.`,
  ];
}

function affiliates(): string[] {
  const stores = new Set(
    AFFILIATE_HOSTS.map((host) => (host.startsWith("amazon.") ? "Amazon" : host.startsWith("ebay.") ? "eBay" : host)),
  );
  return [
    `On the English site, links to these stores are affiliate links, so Atlens earns a commission when someone buys through them: ${list([...stores])}. The Chinese site has no affiliate links.`,
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
    `Main features, named as the site shows them; use these exact names: ${list([
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
    `The site is available in ${list(routing.locales.map((code) => LANGUAGE_NAMES[code] ?? code))}.`,
  ];
}

const GENERATED: Partial<Record<SiteTopic, (locale: string) => string[]>> = {
  business: affiliates,
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
      ...HANDWRITTEN_FACTS.filter((fact) => fact.topic === topic).map((fact) => fact.text),
      ...(GENERATED[topic]?.(messagesLocale) ?? []),
    ],
  }));
}
