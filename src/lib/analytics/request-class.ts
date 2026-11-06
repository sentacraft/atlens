export type NetworkClass = "datacenter" | "mobile" | "other";
export type UserAgentClass = "bot" | "in_app" | "browser";

export interface RequestAttributes {
  country: string | null;
  network: NetworkClass | null;
  uaClass: UserAgentClass | null;
}

const DATACENTER_ORG =
  /amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|oracle|alibaba|tencent cloud|vultr|cloud|hosting|data ?cent|server|vps/i;
const MOBILE_ORG = /mobile|wireless|cellular|\blte\b|\b5g\b/i;

/** A coarse class from the network's organization name; the name itself is never stored. */
export function classifyNetwork(organization: string | null | undefined): NetworkClass | null {
  if (!organization) {
    return null;
  }
  if (DATACENTER_ORG.test(organization)) {
    return "datacenter";
  }
  return MOBILE_ORG.test(organization) ? "mobile" : "other";
}

const BOT_UA = /bot|crawl|spider|headless|lighthouse|preview|monitor|curl|python-requests|go-http/i;
const IN_APP_UA = /micromessenger|fban|fbav|instagram|line\/|twitter|weibo|dingtalk|qq\/|\bwv\b/i;

export function classifyUserAgent(userAgent: string | null | undefined): UserAgentClass | null {
  if (!userAgent) {
    return null;
  }
  if (BOT_UA.test(userAgent)) {
    return "bot";
  }
  return IN_APP_UA.test(userAgent) ? "in_app" : "browser";
}

/** The request's country, network class and user-agent class; each is null when unknown. */
export function requestAttributes(
  headers: { get(name: string): string | null },
  cf: { country?: string; asOrganization?: string } | undefined,
): RequestAttributes {
  const country = (cf?.country ?? headers.get("cf-ipcountry") ?? "").toUpperCase();
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    network: classifyNetwork(cf?.asOrganization),
    uaClass: classifyUserAgent(headers.get("user-agent")),
  };
}
