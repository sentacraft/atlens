"use client";

import { createContext, useContext, useMemo, useState } from "react";
import AuthDialog, { type SignInReason } from "@/components/auth/AuthDialog";
import { track } from "@/lib/analytics/analytics";

/** What opened the dialog: an action that needs an account, or a plain sign-in button by where it sits. */
export type SignInSource = SignInReason | "account_menu" | "profile" | "iris_history" | "iris_reply";

type OpenSignIn = (source: SignInSource) => void;

const SignInDialogContext = createContext<OpenSignIn>(() => {});

export function SignInDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; reason?: SignInReason }>({ open: false });
  const openSignIn = useMemo<OpenSignIn>(
    () => (source) => {
      const reason = source === "favorite" || source === "gear" ? source : undefined;
      track("sign_in_open", reason ? { reason } : { reason: "general", entry: source });
      setState({ open: true, reason });
    },
    [],
  );
  return (
    <SignInDialogContext value={openSignIn}>
      {children}
      <AuthDialog
        open={state.open}
        reason={state.reason}
        onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
      />
    </SignInDialogContext>
  );
}

/** Opens the sign-in dialog; an action source adds a title and the benefits of an account for that action. */
export function useSignInDialog(): OpenSignIn {
  return useContext(SignInDialogContext);
}
