export const CHAT_ERROR_KINDS = ["rate_limit", "unavailable"] as const;

export type ChatErrorKind = (typeof CHAT_ERROR_KINDS)[number];

export function isChatErrorKind(value: unknown): value is ChatErrorKind {
  return typeof value === "string" && (CHAT_ERROR_KINDS as readonly string[]).includes(value);
}

export function chatErrorResponse(kind: ChatErrorKind, status: number): Response {
  return Response.json({ kind }, { status });
}
