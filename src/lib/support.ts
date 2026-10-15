export type DonationChannel = "wechat" | "kofi";

/** How a visitor on this locale's site can tip: the WeChat appreciation code in Chinese, Ko-fi elsewhere. */
export function donationChannel(locale: string): DonationChannel {
  return locale === "zh" ? "wechat" : "kofi";
}

export const KOFI_URL = "https://ko-fi.com/sentacraft";
