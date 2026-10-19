"use client";

import { useTranslations } from "next-intl";
import { isChatErrorKind, type ChatErrorKind } from "@/lib/ai/chat-errors";

type ErrorDisplay = ChatErrorKind | "transient";

const ERROR_MESSAGE_KEY: Record<ChatErrorKind, "rateLimited" | "errorUnavailable"> = {
  rate_limit: "rateLimited",
  unavailable: "errorUnavailable",
};

// The transport puts the raw response body in Error.message, with no status code.
export function classifyError(error: Error | undefined): ErrorDisplay {
  if (error) {
    try {
      const body = JSON.parse(error.message) as { kind?: unknown };
      if (isChatErrorKind(body.kind)) {
        return body.kind;
      }
    } catch {
    }
  }
  return "transient";
}

export default function AskIrisError({
  kind,
  onRetry,
}: {
  kind: ErrorDisplay;
  onRetry: () => void;
}) {
  const t = useTranslations("AskIris");
  return (
    <div role="alert" className="px-1 text-sm text-zinc-500">
      {kind === "transient" ? (
        t.rich("errorRetry", {
          retry: (chunks) => (
            <button
              type="button"
              onClick={onRetry}
              className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
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
