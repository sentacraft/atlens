"use client";

import { useFormatter, useTranslations } from "next-intl";
import { parseChatError, type ChatError } from "@/lib/ai/chat-errors";
import { IRIS_QUOTA } from "@/lib/ai/iris-quota";
import { Heart } from "lucide-react";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import { useSupportDialog } from "@/context/SupportDialogProvider";
import { ACTION_PRIMARY_CLS, CHAT_CARD_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

type ErrorDisplay = ChatError | { kind: "transient" };

// The transport puts the raw response body in Error.message, with no status code.
export function classifyError(error: Error | undefined): ErrorDisplay {
  if (error) {
    try {
      const parsed = parseChatError(JSON.parse(error.message));
      if (parsed) {
        return parsed;
      }
    } catch {
    }
  }
  return { kind: "transient" };
}

export const RESET_AT_FORMAT = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } as const;

const linkClass = "font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900";

export default function AskIrisError({
  error,
  onRetry,
}: {
  error: ErrorDisplay;
  onRetry: () => void;
}) {
  const t = useTranslations("AskIris");
  const format = useFormatter();
  const openSignIn = useSignInDialog();
  const openSupport = useSupportDialog();
  // The app formats in UTC so server and browser agree; this only renders after a failed send,
  // so it can use the visitor's own time zone for when they can ask again.
  const resetAt =
    "resetAt" in error && error.resetAt !== undefined
      ? format.dateTime(error.resetAt, { ...RESET_AT_FORMAT, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      : "";
  if (error.kind === "account_quota" || error.kind === "budget") {
    return (
      <div role="alert" className={cn(CHAT_CARD_CLS, "flex flex-col items-start gap-2.5 p-4")}>
        <p className="text-sm font-medium text-zinc-900">
          {error.kind === "account_quota" ? t("accountQuota", { resetAt }) : t("budgetExhausted", { resetAt })}
        </p>
        <p className="text-[13px] leading-relaxed text-zinc-600">{t("limitSupportBody")}</p>
        <button
          type="button"
          onClick={() => openSupport("iris_limit")}
          className={cn(ACTION_PRIMARY_CLS, "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium")}
        >
          <Heart className="size-3.5" aria-hidden="true" />
          {t("limitSupport")}
        </button>
      </div>
    );
  }

  return (
    <div role="alert" className="px-1 text-sm text-zinc-500">
      {error.kind === "transient" ? (
        t.rich("errorRetry", {
          retry: (chunks) => (
            <button type="button" onClick={onRetry} className={linkClass}>
              {chunks}
            </button>
          ),
        })
      ) : error.kind === "guest_quota" ? (
        t.rich("guestQuota", {
          guestTurns: IRIS_QUOTA.guestTurnsDaily,
          signIn: (chunks) => (
            <button type="button" onClick={() => openSignIn("iris_quota")} className={linkClass}>
              {chunks}
            </button>
          ),
        })
      ) : (
        <span>{t(error.kind === "rate_limit" ? "rateLimited" : "errorUnavailable")}</span>
      )}
    </div>
  );
}
