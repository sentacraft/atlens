import { firstSearchParam } from "@/lib/url/search-params";
import { ASK_IRIS_PATH } from "@/lib/url/routes";

export const ASKIRIS_PARAMS = {
  query: "q",
  conversation: "conversation",
} as const;

/** Opens a conversation on the Ask Iris page. */
export function askIrisConversationPath(conversationId: string): string {
  return `${ASK_IRIS_PATH}?${new URLSearchParams({ [ASKIRIS_PARAMS.conversation]: conversationId })}`;
}

/** Opens Ask Iris and sends `query` as the first message. */
export function askIrisHandoffPath(query: string): string {
  return `${ASK_IRIS_PATH}?${new URLSearchParams({ [ASKIRIS_PARAMS.query]: query })}`;
}

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

/** Where a chat keeps the open conversation: the address bar on the Ask Iris page, nowhere in the panel. */
export interface ConversationLocation {
  read(): string | null;
  write(conversationId: string | null, mode: "push" | "replace"): void;
  followsHistory: boolean;
}

export const URL_CONVERSATION_LOCATION: ConversationLocation = {
  read: readConversationParam,
  write: writeConversationParam,
  followsHistory: true,
};

export const DETACHED_CONVERSATION_LOCATION: ConversationLocation = {
  read: () => null,
  write: () => {},
  followsHistory: false,
};

export function clearEntryParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(ASKIRIS_PARAMS.query);
  url.searchParams.delete(ASKIRIS_PARAMS.conversation);
  window.history.replaceState(null, "", url.toString());
}
