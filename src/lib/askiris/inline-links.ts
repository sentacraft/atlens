import { SITE } from "@/config/site";
import { MAX_COMPARE } from "@/lib/lens/lens";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";
import { ABOUT_PATH, GET_APP_PATH, RECENTLY_ADDED_PATH, aboutPath, profilePath } from "@/lib/url/routes";

/**
 * Links Iris writes in its prose as `[label](scheme:value)`. Iris only names a key, a ref, or a
 * slug; the chat resolves it to a URL, and anything it can't resolve renders as plain text.
 */

// Labels are `{Namespace.key}` UI strings, so a link reads as the site names that page.
export const PAGE_LINKS = {
  about: { href: ABOUT_PATH, label: "{About.pageTitle}" },
  aboutBackground: { href: aboutPath("background"), label: "{About.backgroundTitle}" },
  aboutAskIris: { href: aboutPath("ask-iris"), label: "{About.askIrisTitlePlain}" },
  aboutDataAccuracy: { href: aboutPath("data-accuracy"), label: "{About.dataAccuracyTitle}" },
  aboutCoverage: { href: aboutPath("coverage"), label: "{About.coverageTitle}" },
  aboutSupport: { href: aboutPath("support"), label: "{About.supportTitle}" },
  aboutPrivacy: { href: aboutPath("privacy"), label: "{About.privacyTitle}" },
  aboutDisclaimer: { href: aboutPath("disclaimer"), label: "{About.disclaimerTitle}" },
  aboutAck: { href: aboutPath("ack"), label: "{About.ackTitle}" },
  getApp: { href: GET_APP_PATH, label: "{Nav.getApp}" },
  recentlyAdded: { href: RECENTLY_ADDED_PATH, label: "{RecentlyAdded.pageTitle}" },
  profileFavorites: { href: profilePath("favorites"), label: "{Profile.favoritesTitle}" },
  profileGear: { href: profilePath("gear"), label: "{Profile.gearTitle}" },
  repo: { href: SITE.repoUrl, label: "GitHub", external: true },
  readmePipeline: { href: SITE.pipelineDocUrl, label: "{About.dataGitHubCardTitle}", external: true },
  dataLicense: { href: SITE.dataLicenseUrl, label: "{AskIris.linkDataLicense}", external: true },
} as const satisfies Record<string, { href: string; label: string; external?: boolean }>;

export type PageLinkKey = keyof typeof PAGE_LINKS;

export const ACTION_LINKS = {
  feedback: { label: "{Nav.feedback}" },
  signIn: { label: "{Auth.signIn}" },
} as const;
export type LinkAction = keyof typeof ACTION_LINKS;

/** A link a site fact points to; siteInfo hands it to Iris to copy into its reply. */
export type FactLink = `page:${PageLinkKey}` | `action:${LinkAction}`;

/** A fact link as markdown, its label still a `{Namespace.key}` placeholder. */
export function factLinkMarkdown(link: FactLink): string {
  const [scheme, key] = link.split(":") as ["page", PageLinkKey] | ["action", LinkAction];
  const { label } = scheme === "page" ? PAGE_LINKS[key] : ACTION_LINKS[key];
  return `[${label}](${link})`;
}

export function collectionLink(slug: string): string {
  return `collection:${slug}`;
}

export function brandLink(slug: string): string {
  return `brand:${slug}`;
}

export const CHART_KEYS = ["timeline", "weight", "lineups"] as const;
export type ChartKey = (typeof CHART_KEYS)[number];

export function chartLink(chart: ChartKey): string {
  return `chart:${chart}`;
}

/** What the chat can link to: every lens by ref, and the collection and brand slugs. */
export interface ChatLinkTargets {
  lenses: LensLinkIndex;
  collections: string[];
  brands: string[];
}

function isKeyOf<T extends object>(value: string, record: T): value is Extract<keyof T, string> {
  return Object.hasOwn(record, value);
}

function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

function compareRefs(value: string): string[] | null {
  const refs = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
  return refs.length >= 2 && refs.length <= MAX_COMPARE ? refs : null;
}

// One parser per scheme: the scheme list, the matcher, and the ChatLink type all derive from it.
const PARSERS = {
  lens: (value: string) => ({ kind: "lens", ref: value }) as const,
  page: (value: string) => (isKeyOf(value, PAGE_LINKS) ? ({ kind: "page", key: value }) as const : null),
  action: (value: string) => (isKeyOf(value, ACTION_LINKS) ? ({ kind: "action", action: value }) as const : null),
  compare: (value: string) => {
    const refs = compareRefs(value);
    return refs ? ({ kind: "compare", refs }) as const : null;
  },
  collection: (value: string) => ({ kind: "collection", slug: value }) as const,
  brand: (value: string) => ({ kind: "brand", slug: value }) as const,
  chart: (value: string) => (isOneOf(value, CHART_KEYS) ? ({ kind: "chart", chart: value }) as const : null),
  source: (value: string) => (/^[0-9a-z]+$/.test(value) ? ({ kind: "source", key: value }) as const : null),
};

type ChatLinkScheme = keyof typeof PARSERS;
export type ChatLink = NonNullable<ReturnType<(typeof PARSERS)[ChatLinkScheme]>>;

const CHAT_LINK_RE = new RegExp(`^(${Object.keys(PARSERS).join("|")}):(.*)$`);

/** Null for an ordinary URL, or a chat link whose value is malformed. */
export function parseChatLink(href: string | undefined): ChatLink | null {
  const match = href?.match(CHAT_LINK_RE);
  return match ? PARSERS[match[1] as ChatLinkScheme](match[2]) : null;
}

/** Schemes the markdown renderer must keep instead of stripping as unknown protocols. */
export function isChatLinkHref(url: string): boolean {
  return CHAT_LINK_RE.test(url);
}
