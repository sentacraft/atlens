export const CHAT_ERROR_KINDS = ["rate_limit", "guest_quota", "account_quota", "budget", "unavailable"] as const;

export type ChatErrorKind = (typeof CHAT_ERROR_KINDS)[number];

/** A chat error body; `resetAt` (epoch ms) comes with the quota kinds. */
export interface ChatError {
  kind: ChatErrorKind;
  resetAt?: number;
}

export function parseChatError(value: unknown): ChatError | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { kind, resetAt } = value as { kind?: unknown; resetAt?: unknown };
  if (typeof kind !== "string" || !(CHAT_ERROR_KINDS as readonly string[]).includes(kind)) {
    return null;
  }
  return {
    kind: kind as ChatErrorKind,
    ...(typeof resetAt === "number" && Number.isFinite(resetAt) ? { resetAt } : {}),
  };
}

export function chatErrorResponse(error: ChatErrorKind | ChatError, status: number): Response {
  return Response.json(typeof error === "string" ? { kind: error } : error, { status });
}
