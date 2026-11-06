export type NetworkClass = "datacenter" | "mobile" | "other";
/** A named app's in-app browser, `in_app` for an unnamed one, `bot`, or a regular `browser`. */
export type UserAgentClass = InAppName | "in_app" | "bot" | "browser";

type InAppName =
  | "wechat"
  | "wecom"
  | "xiaohongshu"
  | "qq"
  | "weibo"
  | "douyin"
  | "toutiao"
  | "tiktok"
  | "bytedance"
  | "kuaishou"
  | "bilibili"
  | "zhihu"
  | "baidu"
  | "alipay"
  | "taobao"
  | "dingtalk"
  | "lark"
  | "messenger"
  | "facebook"
  | "instagram"
  | "threads"
  | "x"
  | "line"
  | "reddit"
  | "snapchat"
  | "linkedin"
  | "pinterest";

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
// First match wins, so an app is listed before any app whose marker its user agent also carries:
// WeCom carries MicroMessenger, Messenger carries FBAN, and every ByteDance app BytedanceWebview.
const IN_APP_UA: [InAppName, RegExp][] = [
  ["wecom", /wxwork/i],
  ["wechat", /micromessenger/i],
  ["xiaohongshu", /xhsdiscover/i],
  ["qq", /\bqq\//i],
  ["weibo", /weibo/i],
  ["tiktok", /musical_ly|trill_|tiktok/i],
  ["douyin", /aweme/i],
  ["toutiao", /newsarticle/i],
  ["bytedance", /bytedancewebview/i],
  ["kuaishou", /kwai/i],
  ["bilibili", /biliapp/i],
  ["zhihu", /zhihuhybrid/i],
  ["baidu", /baiduboxapp/i],
  ["alipay", /alipayclient/i],
  ["taobao", /aliapp\(tb/i],
  ["dingtalk", /dingtalk/i],
  ["lark", /\blark\/|feishu/i],
  ["messenger", /fb_iab\/messenger|messengerforios|\borca-android/i],
  ["threads", /\bbarcelona/i],
  ["instagram", /instagram/i],
  ["facebook", /fban|fbav|fb_iab/i],
  ["x", /twitter/i],
  ["line", /\bline\//i],
  ["reddit", /reddit/i],
  ["snapchat", /snapchat/i],
  ["linkedin", /linkedinapp/i],
  ["pinterest", /pinterest/i],
];
// An Android WebView marks itself "wv"; an iOS WKWebView leaves out the "Safari/" token every iOS
// browser, Chrome and Firefox included, sends.
const ANDROID_WEBVIEW_UA = /\bwv\b/i;
const IOS_UA = /iphone|ipad|ipod/i;

export function classifyUserAgent(userAgent: string | null | undefined): UserAgentClass | null {
  if (!userAgent) {
    return null;
  }
  if (BOT_UA.test(userAgent)) {
    return "bot";
  }
  const app = IN_APP_UA.find(([, pattern]) => pattern.test(userAgent));
  if (app) {
    return app[0];
  }
  const webview = ANDROID_WEBVIEW_UA.test(userAgent) || (IOS_UA.test(userAgent) && !/safari\//i.test(userAgent));
  return webview ? "in_app" : "browser";
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
