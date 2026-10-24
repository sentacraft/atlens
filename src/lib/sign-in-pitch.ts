const FAVORITES = "benefitFavorites";
const GEAR = "benefitGear";
const CHATS = "benefitChats";
const QUOTA = "benefitQuota";
const REVIEWS = "benefitReviews";

/**
 * Every place a sign-in starts from, and how it pitches an account there: the dialog's `Auth`
 * title, and the same `Auth` benefits, the one closest to what the user was doing first.
 */
export const SIGN_IN_PITCHES = {
  reviews: { title: "reasonReviewsTitle", benefits: [REVIEWS, FAVORITES, GEAR, CHATS, QUOTA] },
  favorite: { title: "reasonFavoriteTitle", benefits: [FAVORITES, GEAR, CHATS, QUOTA, REVIEWS] },
  gear: { title: "reasonGearTitle", benefits: [GEAR, FAVORITES, CHATS, QUOTA, REVIEWS] },
  iris_favorites: { title: "title", benefits: [FAVORITES, GEAR, CHATS, QUOTA, REVIEWS] },
  iris_history: { title: "reasonChatsTitle", benefits: [CHATS, GEAR, FAVORITES, QUOTA, REVIEWS] },
  iris_quota: { title: "reasonQuotaTitle", benefits: [QUOTA, CHATS, GEAR, FAVORITES, REVIEWS] },
  iris_reply: { title: "title", benefits: [FAVORITES, GEAR, CHATS, QUOTA, REVIEWS] },
  account_menu: { title: "title", benefits: [FAVORITES, GEAR, CHATS, QUOTA, REVIEWS] },
  profile: { title: "title", benefits: [GEAR, FAVORITES, CHATS, QUOTA, REVIEWS] },
} as const satisfies Record<string, { title: string; benefits: readonly string[] }>;

export type SignInSource = keyof typeof SIGN_IN_PITCHES;


/** Sources that are an action the user tried; analytics records the rest as general, by entry. */
export const SIGN_IN_ACTIONS = ["favorite", "gear", "reviews"] as const satisfies readonly SignInSource[];

/** What an in-chat sign-in card is for, and the source its sign-in is recorded and pitched as. */
export const SIGN_IN_CARD_SOURCE = {
  favorites: "iris_favorites",
  gear: "gear",
} as const satisfies Record<string, SignInSource>;

export type SignInCardReason = keyof typeof SIGN_IN_CARD_SOURCE;
