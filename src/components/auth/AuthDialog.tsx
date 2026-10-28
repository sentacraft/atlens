"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { track } from "@/lib/analytics/analytics";
import { authClient } from "@/lib/auth-client";
import { useTurnstile } from "@/hooks/useTurnstile";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { SIGN_IN_PITCHES, type SignInSource } from "@/lib/sign-in-pitch";
import SignInBenefits from "@/components/auth/SignInBenefits";
import FreeNote from "@/components/auth/FreeNote";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";

type SocialProvider = "google" | "github";

const SOCIAL_BUTTON_CLS =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 max-sm:h-11";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.97c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5z"
      />
    </svg>
  );
}

const SOCIAL_PROVIDERS: { id: SocialProvider; name: string; Logo: () => React.ReactNode }[] = [
  { id: "google", name: "Google", Logo: GoogleLogo },
  { id: "github", name: "GitHub", Logo: GitHubLogo },
];

// Better Auth's captcha plugin answers these when the Turnstile token is missing or rejected.
const BOT_CHECK_ERRORS = ["MISSING_RESPONSE", "VERIFICATION_FAILED"];

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


export default function AuthDialog({
  open,
  onOpenChange,
  source,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where the sign-in started, which words the title and orders the benefits. */
  source: SignInSource;
  returnTo?: string;
}) {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSeconds, startResendCooldown] = useCountdown(RESEND_COOLDOWN_MS);
  const { container: turnstileContainer, interactive: turnstileShown, takeToken } = useTurnstile("email-otp");

  function errorMessage(error: { status?: number; code?: string; message?: string }) {
    if (error.status === 429) {
      return t("tooManyRequests");
    }
    if (error.code && BOT_CHECK_ERRORS.includes(error.code)) {
      return t("botCheckFailed");
    }
    return error.message || t("genericError");
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

  async function signInWithProvider(provider: SocialProvider) {
    track("sign_in_submit", { method: provider });
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: returnTo ?? window.location.href,
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
      const token = await takeToken();
      if (!token) {
        setError(t("botCheckFailed"));
        setPending(false);
        return;
      }
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
        fetchOptions: { headers: { "x-captcha-response": token } },
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
          <DialogTitle>{t(SIGN_IN_PITCHES[source].title)}</DialogTitle>
          <DialogDescription render={<div />} className="flex flex-col gap-3 pt-1.5">
            <FreeNote />
            <SignInBenefits source={source} className="text-sm" />
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-5 pb-5">
          {step === "email" ? (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {SOCIAL_PROVIDERS.map(({ id, name, Logo }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void signInWithProvider(id)}
                    disabled={pending}
                    aria-label={t("continueWith", { provider: name })}
                    className={SOCIAL_BUTTON_CLS}
                  >
                    <Logo />
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200" />
                {t("orEmail")}
                <span className="h-px flex-1 bg-zinc-200" />
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendOtp();
                }}
                className="flex flex-col gap-3"
              >
                <label className="flex flex-col text-sm text-zinc-700">
                  <span className="sr-only">{t("emailLabel")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("emailPlaceholder")}
                    required
                    autoComplete="email"
                    className="h-10 rounded-lg border border-zinc-200 bg-white px-3 max-sm:h-11 max-sm:text-base outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(ACTION_PRIMARY_CLS, "h-10 rounded-lg text-sm max-sm:h-11")}
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
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 max-sm:h-11 max-sm:text-base tracking-[0.3em] outline-none transition-colors placeholder:tracking-normal placeholder:text-zinc-400 focus:border-zinc-500"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className={cn(ACTION_PRIMARY_CLS, "h-10 rounded-lg text-sm max-sm:h-11")}
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
          {/* display:none would stop the invisible check from running, so park it outside the flow. */}
          <div ref={turnstileContainer} className={cn(!turnstileShown && "absolute size-0 overflow-hidden")} />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </DialogPopup>
    </Dialog>
  );
}
