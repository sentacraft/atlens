/** Where a link Atlens hands out was shared from; it rides on the link as `?src=`. */
export type LinkSource = "share_copy" | "share_sheet" | "poster" | "site_link";

export interface LandingSource {
  src?: string;
  campaign?: string;
}

const SOURCE_PARAM = "src";
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const TAG_PARAMS = [SOURCE_PARAM, ...UTM_PARAMS];

/** The URL with this source tag, replacing any tag it already carried. */
export function withSource(url: string, source: LinkSource): string {
  const parsed = new URL(url);
  for (const name of TAG_PARAMS) {
    parsed.searchParams.delete(name);
  }
  parsed.searchParams.set(SOURCE_PARAM, source);
  return parsed.toString();
}

/** The `?src=` (or `utm_source`) and `utm_campaign` tags in a query string. */
export function readSource(search: string): LandingSource {
  const params = new URLSearchParams(search);
  const src = params.get(SOURCE_PARAM) ?? params.get("utm_source") ?? undefined;
  const campaign = params.get("utm_campaign") ?? undefined;
  return { ...(src ? { src } : {}), ...(campaign ? { campaign } : {}) };
}

/** The URL without source tags, or null when it has none. */
export function stripSource(url: string): string | null {
  const parsed = new URL(url);
  const tagged = TAG_PARAMS.filter((name) => parsed.searchParams.has(name));
  if (tagged.length === 0) {
    return null;
  }
  for (const name of tagged) {
    parsed.searchParams.delete(name);
  }
  return parsed.toString();
}
