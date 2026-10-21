"use client";

import { createContext, useContext, useMemo, useState } from "react";
import AuthDialog from "@/components/auth/AuthDialog";
import type { SignInReason } from "@/lib/sign-in-reason";
import { track } from "@/lib/analytics/analytics";

/** What opened the dialog: an action that needs an account, or a plain sign-in button by where it sits. */
export type SignInSource = SignInReason | "account_menu" | "profile" | "iris_history" | "iris_reply" | "iris_top_bar";

/** `returnTo` is where a sign-in that leaves the page (Google) comes back to; this page by default. */
type OpenSignIn = (source: SignInSource, options?: { returnTo?: string }) => void;

const SignInDialogContext = createContext<OpenSignIn>(() => {});

export function SignInDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; reason?: SignInReason; returnTo?: string }>({ open: false });
  const openSignIn = useMemo<OpenSignIn>(
    () => (source, options) => {
      const reason = source === "favorite" || source === "gear" ? source : undefined;
      track("sign_in_open", reason ? { reason } : { reason: "general", entry: source });
      setState({ open: true, reason, returnTo: options?.returnTo });
    },
    [],
  );
  return (
    <SignInDialogContext value={openSignIn}>
      {children}
      <AuthDialog
        open={state.open}
        reason={state.reason}
        returnTo={state.returnTo}
        onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
      />
    </SignInDialogContext>
  );
}

/** Opens the sign-in dialog; an action source adds a title and the benefits of an account for that action. */
export function useSignInDialog(): OpenSignIn {
  return useContext(SignInDialogContext);
}
