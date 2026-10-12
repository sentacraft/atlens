import { firstSearchParam } from "@/lib/url/search-params";

/** Single source of truth for the /askiris URL shape. */
export const ASKIRIS_PARAMS = {
  /** A question handed off from another page; sent once on arrival, then removed. */
  query: "q",
  /** The persisted conversation on screen. */
  conversation: "conversation",
} as const;

// `q` and `conversation` are mutually exclusive in intent; when both are present the
// hand-off wins and a new conversation starts, because the visitor arrived with a
// new question.
export type AskIrisEntry =
  | { kind: "new" }
  | { kind: "handoff"; query: string }
  | { kind: "resume"; conversationId: string };

type SearchParamValue = string | string[] | undefined;

export function resolveAskIrisEntry(params: Record<string, SearchParamValue>): AskIrisEntry {
  const query = firstSearchParam(params[ASKIRIS_PARAMS.query])?.trim();
  if (query) {
    return { kind: "handoff", query };
  }
  const conversationId = firstSearchParam(params[ASKIRIS_PARAMS.conversation])?.trim();
  if (conversationId) {
    return { kind: "resume", conversationId };
  }
  return { kind: "new" };
}

export function readConversationParam(): string | null {
  return new URL(window.location.href).searchParams.get(ASKIRIS_PARAMS.conversation) || null;
}

// "push" for user-initiated switches, so Back returns to the previous conversation;
// "replace" for bookkeeping that must not add a history entry.
export function writeConversationParam(
  conversationId: string | null,
  mode: "push" | "replace",
): void {
  const url = new URL(window.location.href);
  if ((url.searchParams.get(ASKIRIS_PARAMS.conversation) || null) === conversationId) {
    return;
  }
  if (conversationId) {
    url.searchParams.set(ASKIRIS_PARAMS.conversation, conversationId);
  } else {
    url.searchParams.delete(ASKIRIS_PARAMS.conversation);
  }
  if (mode === "push") {
    window.history.pushState(null, "", url.toString());
  } else {
    window.history.replaceState(null, "", url.toString());
  }
}

/** Drops the entry params once consumed, so a reload does not replay them. */
export function clearEntryParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(ASKIRIS_PARAMS.query);
  url.searchParams.delete(ASKIRIS_PARAMS.conversation);
  window.history.replaceState(null, "", url.toString());
}
