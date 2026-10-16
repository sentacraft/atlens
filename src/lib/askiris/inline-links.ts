import { SITE } from "@/config/site";
import { MAX_COMPARE } from "@/lib/lens/lens";
import { parseLensLink, type LensLinkIndex } from "@/lib/ai/lens-ref";
import { ABOUT_PATH, GET_APP_PATH, RECENTLY_ADDED_PATH, aboutPath, profilePath } from "@/lib/url/routes";

/**
 * Links Iris writes in its prose as `[label](scheme:value)`. Iris only names a key, a ref, or a
 * slug; the chat resolves it to a URL, and anything it can't resolve renders as plain text.
 */

export const PAGE_LINKS = {
  about: { href: ABOUT_PATH },
  aboutBackground: { href: aboutPath("background") },
  aboutAskIris: { href: aboutPath("ask-iris") },
  aboutDataAccuracy: { href: aboutPath("data-accuracy") },
  aboutCoverage: { href: aboutPath("coverage") },
  aboutSupport: { href: aboutPath("support") },
  aboutPrivacy: { href: aboutPath("privacy") },
  aboutDisclaimer: { href: aboutPath("disclaimer") },
  aboutAck: { href: aboutPath("ack") },
  getApp: { href: GET_APP_PATH },
  recentlyAdded: { href: RECENTLY_ADDED_PATH },
  profileFavorites: { href: profilePath("favorites") },
  profileGear: { href: profilePath("gear") },
  repo: { href: SITE.repoUrl, external: true },
  readmePipeline: { href: SITE.pipelineDocUrl, external: true },
  dataLicense: { href: SITE.dataLicenseUrl, external: true },
} as const satisfies Record<string, { href: string; external?: boolean }>;

export type PageLinkKey = keyof typeof PAGE_LINKS;

export const LINK_ACTIONS = ["feedback", "signIn"] as const;
export type LinkAction = (typeof LINK_ACTIONS)[number];

/** A link a site fact points to; siteInfo hands it to Iris to copy into its reply. */
export type FactLink = `page:${PageLinkKey}` | `action:${LinkAction}`;

export function collectionLink(slug: string): string {
  return `collection:${slug}`;
}

/** What the chat can link to: every lens by ref, and the collection slugs. */
export interface ChatLinkTargets {
  lenses: LensLinkIndex;
  collections: string[];
}

export type ChatLink =
  | { kind: "lens"; ref: string }
  | { kind: "page"; key: PageLinkKey }
  | { kind: "action"; action: LinkAction }
  | { kind: "compare"; refs: string[] }
  | { kind: "collection"; slug: string };

function isKeyOf<T extends object>(value: string, record: T): value is Extract<keyof T, string> {
  return Object.hasOwn(record, value);
}

/** Null for an ordinary URL, or a chat link whose value is malformed. */
export function parseChatLink(href: string | undefined): ChatLink | null {
  const ref = parseLensLink(href);
  if (ref !== null) {
    return { kind: "lens", ref };
  }
  const match = href?.match(/^(page|action|compare|collection):(.+)$/);
  if (!match) {
    return null;
  }
  const [, scheme, value] = match;
  switch (scheme) {
    case "page":
      return isKeyOf(value, PAGE_LINKS) ? { kind: "page", key: value } : null;
    case "action":
      return (LINK_ACTIONS as readonly string[]).includes(value) ? { kind: "action", action: value as LinkAction } : null;
    case "compare": {
      const refs = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))];
      return refs.length >= 2 && refs.length <= MAX_COMPARE ? { kind: "compare", refs } : null;
    }
    default:
      return { kind: "collection", slug: value };
  }
}

/** Schemes the markdown renderer must keep instead of stripping as unknown protocols. */
export function isChatLinkHref(url: string): boolean {
  return /^(lens|page|action|compare|collection):/.test(url);
}
