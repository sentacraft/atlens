export type DonationChannel = "wechat" | "kofi";

/** Both ways to tip, the one this locale's visitors are likelier to use first. */
export function donationChannels(locale: string): DonationChannel[] {
  return locale === "zh" ? ["wechat", "kofi"] : ["kofi", "wechat"];
}

export const KOFI_URL = "https://ko-fi.com/sentacraft";

/** 720px, three times the dialog's 240px slot; a new code replaces the file under the same name. */
export const WECHAT_QR_SRC = "/wechat-qr.jpg";

/** Where a support dialog was opened from, for analytics. */
export const SUPPORT_ENTRIES = ["menu", "page_end", "poster_toast", "revisit", "iris_helpful", "iris_limit"] as const;

export type SupportEntry = (typeof SUPPORT_ENTRIES)[number];
