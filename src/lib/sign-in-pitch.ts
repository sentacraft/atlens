const FAVORITES = "benefitFavorites";
const GEAR = "benefitGear";
const CHATS = "benefitChats";

/**
 * Every place a sign-in starts from, and how it pitches an account there: the dialog's `Auth`
 * title, and the same three `Auth` benefits, the one closest to what the user was doing first.
 */
export const SIGN_IN_PITCHES = {
  favorite: { title: "reasonFavoriteTitle", benefits: [FAVORITES, GEAR, CHATS] },
  gear: { title: "reasonGearTitle", benefits: [GEAR, FAVORITES, CHATS] },
  iris_favorites: { title: "title", benefits: [FAVORITES, GEAR, CHATS] },
  iris_top_bar: { title: "reasonChatsTitle", benefits: [CHATS, GEAR, FAVORITES] },
  iris_history: { title: "reasonChatsTitle", benefits: [CHATS, GEAR, FAVORITES] },
  iris_reply: { title: "title", benefits: [FAVORITES, GEAR, CHATS] },
  account_menu: { title: "title", benefits: [FAVORITES, GEAR, CHATS] },
  profile: { title: "title", benefits: [GEAR, FAVORITES, CHATS] },
} as const satisfies Record<string, { title: string; benefits: readonly string[] }>;

export type SignInSource = keyof typeof SIGN_IN_PITCHES;

/** Sources that are an action the user tried; analytics records the rest as general, by entry. */
export const SIGN_IN_ACTIONS = ["favorite", "gear"] as const satisfies readonly SignInSource[];

/** What an in-chat sign-in card is for, and the source its sign-in is recorded and pitched as. */
export const SIGN_IN_CARD_SOURCE = {
  favorites: "iris_favorites",
  gear: "gear",
} as const satisfies Record<string, SignInSource>;

export type SignInCardReason = keyof typeof SIGN_IN_CARD_SOURCE;
