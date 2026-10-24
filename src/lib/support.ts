export type DonationChannel = "wechat" | "kofi";

/** Both ways to tip, the one this locale's visitors are likelier to use first. */
export function donationChannels(locale: string): DonationChannel[] {
  return locale === "zh" ? ["wechat", "kofi"] : ["kofi", "wechat"];
}

export const KOFI_URL = "https://ko-fi.com/sentacraft";

/** The full-size code, for saving and opening on its own. */
export const WECHAT_QR_SRC = "/wechat-qr.jpg";

// The hash in the name is what lets `public/_headers` cache it for a year: a new code needs a new name.
/** The code as the support dialog shows it, 720px for a 240px slot. */
export const WECHAT_QR_DISPLAY_SRC = "/wechat-qr-425fb78f.webp";

/** Where a support dialog was opened from, for analytics. */
export const SUPPORT_ENTRIES = ["menu", "page_end", "poster_toast", "revisit", "iris_helpful", "iris_limit"] as const;

export type SupportEntry = (typeof SUPPORT_ENTRIES)[number];
