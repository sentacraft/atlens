"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { track } from "@/lib/analytics/analytics";
import { authClient } from "@/lib/auth-client";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { SIGN_IN_BENEFITS, type SignInReason } from "@/lib/sign-in-reason";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

// Matches the email-otp plugin's server limit: 3 sends per 60 seconds.
const RESEND_COOLDOWN_MS = 60_000;

function useCountdown(durationMs: number) {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (until === null) {
      return;
    }
    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  function start() {
    const current = Date.now();
    setNow(current);
    setUntil(current + durationMs);
  }

  const seconds = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return [seconds, start] as const;
}

const REASON_TITLE_KEY = { favorite: "reasonFavoriteTitle", gear: "reasonGearTitle" } as const;

export default function AuthDialog({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: SignInReason;
}) {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, startResendCooldown] = useCountdown(RESEND_COOLDOWN_MS);

  function errorMessage(error: { status?: number; message?: string }) {
    return error.status === 429 ? t("tooManyRequests") : error.message || t("genericError");
  }

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
    track("sign_in_submit", { method: "google" });
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      });
      if (result.error) {
        setError(errorMessage(result.error));
        setPending(false);
      }
    } catch {
      setError(t("genericError"));
      setPending(false);
    }
  }

  async function sendOtp() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (result.error) {
        setError(errorMessage(result.error));
        setPending(false);
        return;
      }
      startResendCooldown();
      setStep("otp");
      setPending(false);
    } catch {
      setError(t("genericError"));
      setPending(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    track("sign_in_submit", { method: "email" });
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.emailOtp({ email, otp });
      if (result.error) {
        setError(errorMessage(result.error));
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
            className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-4 w-4" />
          </DialogClose>
          <DialogTitle>{reason ? t(REASON_TITLE_KEY[reason]) : t("title")}</DialogTitle>
          {reason ? (
            <DialogDescription render={<ul />} className="flex flex-col gap-2 pt-2">
              {SIGN_IN_BENEFITS[reason].map((key) => (
                <li key={key} className="flex gap-2 text-sm text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" strokeWidth={2.5} />
                  {t(key)}
                </li>
              ))}
            </DialogDescription>
          ) : (
            <DialogDescription>{t("description")}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pb-5">
          {step === "email" ? (
            <>
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={pending}
                className="h-10 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("continueWithGoogle")}
              </button>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200" />
                {t("or")}
                <span className="h-px flex-1 bg-zinc-200" />
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendOtp();
                }}
                className="flex flex-col gap-3"
              >
                <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
                  {t("emailLabel")}
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("emailPlaceholder")}
                    required
                    autoComplete="email"
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500"
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
              <p className="text-sm text-zinc-600">
                {t("codeSent", { email })}
              </p>
              <label className="flex flex-col gap-1.5 text-sm text-zinc-700">
                {t("codeLabel")}
                <input
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("codePlaceholder")}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 tracking-[0.3em] outline-none transition-colors placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-500"
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
                onClick={() => void sendOtp()}
                disabled={pending || resendSeconds > 0}
                className="text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:no-underline disabled:hover:text-zinc-500"
              >
                {resendSeconds > 0 ? t("resendIn", { seconds: resendSeconds }) : t("resendCode")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900"
              >
                {t("useDifferentEmail")}
              </button>
            </form>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
