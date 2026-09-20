"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { LogOut, Trash2, UserRound, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  ACTION_PRIMARY_CLS,
  ICON_NAV_BTN_CLS,
  MENU_POPUP_CLS,
} from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useTestHookEnabled } from "@/context/TestHookProvider";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

export default function AuthControl() {
  const t = useTranslations("Auth");
  const { data: session } = authClient.useSession();
  const testHookEnabled = useTestHookEnabled();
  const [loginOpen, setLoginOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        throw new Error("delete_failed");
      }
      window.location.reload();
    } catch {
      setDeleteError(t("genericError"));
      setDeleting(false);
    }
  }

  const user = session?.user;
  if (!testHookEnabled) {
    return null;
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          aria-label={t("login")}
          className={cn(ICON_NAV_BTN_CLS, "h-8 gap-1.5 px-2 text-sm")}
        >
          <UserRound className="h-4 w-4" />
          <span className="hidden sm:inline">{t("login")}</span>
        </button>
        <AuthDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={t("accountLabel")}
          className={cn(
            ICON_NAV_BTN_CLS,
            "h-8 min-w-8 px-1.5 text-xs font-semibold",
          )}
        >
          {initials(user.name, user.email)}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
            <Menu.Popup className={cn(MENU_POPUP_CLS, "w-64")}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user.name || t("account")}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
              <Menu.Item
                onClick={() => authClient.signOut()}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t("logout")}
              </Menu.Item>
              <Menu.Item
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t("deleteAccount")}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogPopup className="max-w-md">
          <DialogHeader>
            <DialogClose
              aria-label={t("close")}
              className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </DialogClose>
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="px-5 pb-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
          )}
          <DialogFooter>
            <DialogClose
              type="button"
              className="h-9 rounded-lg px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              {t("cancel")}
            </DialogClose>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className={cn(
                ACTION_PRIMARY_CLS,
                "h-9 rounded-lg bg-red-600 px-3 text-sm hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-600",
              )}
            >
              {deleting ? t("deleting") : t("deleteAccount")}
            </button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}

function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setOtp("");
    setStep("email");
    setPending(false);
    setError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset();
    }
    onOpenChange(nextOpen);
  }

  async function signInWithGoogle() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });
      if (result.error) {
        setError(result.error.message || t("genericError"));
        setPending(false);
      }
    } catch {
      setError(t("genericError"));
      setPending(false);
    }
  }

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (result.error) {
        setError(result.error.message || t("genericError"));
        setPending(false);
        return;
      }
      setStep("otp");
      setPending(false);
    } catch {
      setError(t("genericError"));
      setPending(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.emailOtp({ email, otp });
      if (result.error) {
        setError(result.error.message || t("genericError"));
        setPending(false);
        return;
      }
      handleOpenChange(false);
    } catch {
      setError(t("genericError"));
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogClose
            aria-label={t("close")}
            className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pb-5">
          {step === "email" ? (
            <>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={pending}
                className="h-10 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                {t("continueWithGoogle")}
              </button>
              <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                {t("or")}
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <form onSubmit={sendOtp} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {t("emailLabel")}
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("emailPlaceholder")}
                    required
                    autoComplete="email"
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(ACTION_PRIMARY_CLS, "h-10 rounded-lg text-sm")}
                >
                  {pending ? t("sending") : t("sendCode")}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={verifyOtp} className="flex flex-col gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t("codeSent", { email })}
              </p>
              <label className="flex flex-col gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                {t("codeLabel")}
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("codePlaceholder")}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 tracking-[0.3em] outline-none transition-colors placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className={cn(ACTION_PRIMARY_CLS, "h-10 rounded-lg text-sm")}
              >
                {pending ? t("signingIn") : t("signIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {t("useDifferentEmail")}
              </button>
            </form>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
