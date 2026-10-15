"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import AuthDialog from "@/components/auth/AuthDialog";

const SignInDialogContext = createContext<() => void>(() => {});

export function SignInDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSignIn = useMemo(() => () => setOpen(true), []);
  return (
    <SignInDialogContext value={openSignIn}>
      {children}
      <AuthDialog open={open} onOpenChange={setOpen} />
    </SignInDialogContext>
  );
}

export function useSignInDialog(): () => void {
  return useContext(SignInDialogContext);
}

/** A toast explaining why an action needs an account, with a button that opens sign-in. */
export function useSignInPrompt(): (message: string) => void {
  const t = useTranslations("Auth");
  const openSignIn = useSignInDialog();
  return useCallback(
    (message: string) => toast(message, { action: { label: t("login"), onClick: openSignIn } }),
    [t, openSignIn],
  );
}
