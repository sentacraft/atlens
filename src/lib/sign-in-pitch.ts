import { IRIS_QUOTA } from "@/lib/ai/iris-quota";

const FAVORITES = "benefitFavorites";
const GEAR = "benefitGear";
const CHATS = "benefitChats";
const QUOTA = "benefitQuota";

/**
 * Every place a sign-in starts from, and how it pitches an account there: the dialog's `Auth`
 * title, and the same `Auth` benefits, the one closest to what the user was doing first.
 */
export const SIGN_IN_PITCHES = {
  favorite: { title: "reasonFavoriteTitle", benefits: [FAVORITES, GEAR, CHATS, QUOTA] },
  gear: { title: "reasonGearTitle", benefits: [GEAR, FAVORITES, CHATS, QUOTA] },
  iris_favorites: { title: "title", benefits: [FAVORITES, GEAR, CHATS, QUOTA] },
  iris_history: { title: "reasonChatsTitle", benefits: [CHATS, GEAR, FAVORITES, QUOTA] },
  iris_quota: { title: "reasonQuotaTitle", benefits: [QUOTA, CHATS, GEAR, FAVORITES] },
  iris_reply: { title: "title", benefits: [FAVORITES, GEAR, CHATS, QUOTA] },
  account_menu: { title: "title", benefits: [FAVORITES, GEAR, CHATS, QUOTA] },
  profile: { title: "title", benefits: [GEAR, FAVORITES, CHATS, QUOTA] },
} as const satisfies Record<string, { title: string; benefits: readonly string[] }>;

export type SignInSource = keyof typeof SIGN_IN_PITCHES;

/** The numbers the `Auth` benefits quote. */
export const SIGN_IN_BENEFIT_VALUES = {
  accountTurns: IRIS_QUOTA.accountTurnsDaily,
  guestTurns: IRIS_QUOTA.guestTurnsDaily,
};

/** Sources that are an action the user tried; analytics records the rest as general, by entry. */
export const SIGN_IN_ACTIONS = ["favorite", "gear"] as const satisfies readonly SignInSource[];

/** What an in-chat sign-in card is for, and the source its sign-in is recorded and pitched as. */
export const SIGN_IN_CARD_SOURCE = {
  favorites: "iris_favorites",
  gear: "gear",
} as const satisfies Record<string, SignInSource>;

export type SignInCardReason = keyof typeof SIGN_IN_CARD_SOURCE;
