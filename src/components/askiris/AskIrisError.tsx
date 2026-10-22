"use client";

import { useFormatter, useTranslations } from "next-intl";
import { parseChatError, type ChatError } from "@/lib/ai/chat-errors";
import { IRIS_QUOTA } from "@/lib/ai/iris-quota";
import { useSignInDialog } from "@/context/SignInDialogProvider";

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
  const turns = { guestTurns: IRIS_QUOTA.guestTurnsDaily, accountTurns: IRIS_QUOTA.accountTurnsDaily };
  // The app formats in UTC so server and browser agree; this only renders after a failed send,
  // so it can use the visitor's own time zone for when they can ask again.
  const resetAt =
    "resetAt" in error && error.resetAt !== undefined
      ? format.dateTime(error.resetAt, { ...RESET_AT_FORMAT, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      : "";
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
          ...turns,
          signIn: (chunks) => (
            <button type="button" onClick={() => openSignIn("iris_quota")} className={linkClass}>
              {chunks}
            </button>
          ),
        })
      ) : error.kind === "account_quota" ? (
        <span>{t("accountQuota", { accountTurns: turns.accountTurns, resetAt })}</span>
      ) : error.kind === "budget" ? (
        <span>{t("budgetExhausted", { resetAt })}</span>
      ) : (
        <span>{t(error.kind === "rate_limit" ? "rateLimited" : "errorUnavailable")}</span>
      )}
    </div>
  );
}
