"use client";

import { createContext, useContext, useMemo, useState } from "react";
import AuthDialog from "@/components/auth/AuthDialog";
import { SIGN_IN_ACTIONS, type SignInSource } from "@/lib/sign-in-pitch";
import { track } from "@/lib/analytics/analytics";

/** `returnTo` is where a sign-in that leaves the page (Google) comes back to; this page by default. */
type OpenSignIn = (source: SignInSource, options?: { returnTo?: string }) => void;

const SignInDialogContext = createContext<OpenSignIn>(() => {});

export type { SignInSource };

export function SignInDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; source: SignInSource; returnTo?: string }>({
    open: false,
    source: "account_menu",
  });
  const openSignIn = useMemo<OpenSignIn>(
    () => (source, options) => {
      const action = (SIGN_IN_ACTIONS as readonly SignInSource[]).includes(source);
      track("sign_in_open", action ? { reason: source } : { reason: "general", entry: source });
      setState({ open: true, source, returnTo: options?.returnTo });
    },
    [],
  );
  return (
    <SignInDialogContext value={openSignIn}>
      {children}
      <AuthDialog
        open={state.open}
        source={state.source}
        returnTo={state.returnTo}
        onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
      />
    </SignInDialogContext>
  );
}

/** Opens the sign-in dialog, titled and pitched for where it was opened from. */
export function useSignInDialog(): OpenSignIn {
  return useContext(SignInDialogContext);
}
