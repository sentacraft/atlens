"use client";

import { useTranslations } from "next-intl";
import { isChatErrorKind, type ChatErrorKind } from "@/lib/ai/chat-errors";

// "transient" is an untagged stream or network error, where a retry may succeed.
type ErrorDisplay = ChatErrorKind | "transient";

// A Record, so adding a ChatErrorKind server-side won't typecheck until a message
// is chosen here too.
const ERROR_MESSAGE_KEY: Record<ChatErrorKind, "rateLimited" | "errorUnavailable"> = {
  rate_limit: "rateLimited",
  unavailable: "errorUnavailable",
};

// The transport throws with the raw response body as the Error message and no status
// code, so the route tags those bodies with a `kind` and we read it back out here.
export function classifyError(error: Error | undefined): ErrorDisplay {
  if (error) {
    try {
      const body = JSON.parse(error.message) as { kind?: unknown };
      if (isChatErrorKind(body.kind)) {
        return body.kind;
      }
    } catch {
      // Not a tagged body — fall through to transient.
    }
  }
  return "transient";
}

// useChat catches request and stream errors into status "error" but renders nothing
// on its own. Only a transient failure is worth a retry: a rate-limit needs a wait,
// an outage will fail identically.
export default function AskIrisError({
  kind,
  onRetry,
}: {
  kind: ErrorDisplay;
  onRetry: () => void;
}) {
  const t = useTranslations("AskIris");
  return (
    <div role="alert" className="px-1 text-sm text-zinc-500 dark:text-zinc-400">
      {kind === "transient" ? (
        t.rich("errorRetry", {
          retry: (chunks) => (
            <button
              type="button"
              onClick={onRetry}
              className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {chunks}
            </button>
          ),
        })
      ) : (
        <span>{t(ERROR_MESSAGE_KEY[kind])}</span>
      )}
    </div>
  );
}
