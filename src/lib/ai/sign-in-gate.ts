import type { SignInReason } from "@/lib/sign-in-reason";

/**
 * Iris's server tools that need an account, by the reason their sign-in card shows. A guest's
 * call pauses the turn on that card, and the tool runs once they sign in. The gear card is a
 * client tool and shows the same card itself.
 */
const SIGN_IN_GATED_TOOLS: Readonly<Record<string, SignInReason>> = {
  myFavorites: "favorite",
  myGear: "gear",
};

export function signInGate(toolName: string): SignInReason | undefined {
  return Object.hasOwn(SIGN_IN_GATED_TOOLS, toolName) ? SIGN_IN_GATED_TOOLS[toolName] : undefined;
}

export const SIGN_IN_GATED_TOOL_NAMES: readonly string[] = Object.keys(SIGN_IN_GATED_TOOLS);

/** What the model reads in place of the tool's result when the guest chose not to sign in. */
export const SIGN_IN_DECLINED =
  "The user chose not to sign in, so this tool did not run. Answer without it, and don't bring up signing in.";

/** streamText's `toolApproval`: a guest's call to a gated tool waits for the user. */
export function signInApproval(signedIn: boolean) {
  return ({ toolCall }: { toolCall: { toolName: string } }) =>
    !signedIn && signInGate(toolCall.toolName) ? ("user-approval" as const) : undefined;
}
