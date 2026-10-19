"use client";

import { createContext, useContext, useMemo, useState } from "react";
import AuthDialog, { type SignInReason } from "@/components/auth/AuthDialog";
import { track } from "@/lib/analytics/analytics";

type OpenSignIn = (reason?: SignInReason) => void;

const SignInDialogContext = createContext<OpenSignIn>(() => {});

export function SignInDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; reason?: SignInReason }>({ open: false });
  const openSignIn = useMemo<OpenSignIn>(
    () => (reason) => {
      track("sign_in_open", { reason: reason ?? "general" });
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

/** Opens the sign-in dialog; a reason adds a title and the benefits of an account for that action. */
export function useSignInDialog(): OpenSignIn {
  return useContext(SignInDialogContext);
}
