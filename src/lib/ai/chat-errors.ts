// The wire contract for a tagged /api/chat error body. `kind` tells the client how
// the user should react to a pre-flight failure — a single source of truth shared by
// the route (which emits it) and the chat client (which maps it to a display bucket,
// adding its own "transient" for an untagged stream/network error).
//
// A const array (not a TS enum) so the values are enumerable at runtime for the
// client's membership check, matching how the rest of the app models closed sets
// (MOUNTS, RECALL_SORT_FIELDS).
export const CHAT_ERROR_KINDS = ["rate_limit", "unavailable"] as const;

export type ChatErrorKind = (typeof CHAT_ERROR_KINDS)[number];

export function isChatErrorKind(value: unknown): value is ChatErrorKind {
  return typeof value === "string" && (CHAT_ERROR_KINDS as readonly string[]).includes(value);
}

// Build the tagged error body the client reads back off the thrown Error's message
// (the transport surfaces a non-2xx body verbatim there). The client keys its own
// localized copy off `kind`, so the body carries only that — never a message the
// user won't see. One place owns the shape.
export function chatErrorResponse(kind: ChatErrorKind, status: number): Response {
  return Response.json({ kind }, { status });
}
