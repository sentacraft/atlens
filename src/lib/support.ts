export type DonationChannel = "wechat" | "kofi";

/** Both ways to tip, the one this locale's visitors are likelier to use first. */
export function donationChannels(locale: string): DonationChannel[] {
  return locale === "zh" ? ["wechat", "kofi"] : ["kofi", "wechat"];
}

export const KOFI_URL = "https://ko-fi.com/sentacraft";

export const WECHAT_QR_SRC = "/wechat-qr.jpg";

/** Where a support dialog was opened from, for analytics. */
export const SUPPORT_ENTRIES = ["menu", "page_end", "poster_toast", "revisit"] as const;

export type SupportEntry = (typeof SUPPORT_ENTRIES)[number];
