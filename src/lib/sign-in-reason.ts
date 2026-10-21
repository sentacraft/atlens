/** An action that needs an account; the sign-in dialog and Iris's sign-in card word their pitch by it. */
export type SignInReason = "favorite" | "gear";

/** The `Auth` benefits of an account, the one the action needs listed first. */
export const SIGN_IN_BENEFITS = {
  favorite: ["benefitFavorites", "benefitGear", "benefitSync"],
  gear: ["benefitGear", "benefitFavorites", "benefitSync"],
} as const satisfies Record<SignInReason, readonly string[]>;
