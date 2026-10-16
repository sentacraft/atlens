import { firstSearchParam } from "@/lib/url/search-params";
import { ASK_IRIS_PATH } from "@/lib/url/routes";

export const ASKIRIS_PARAMS = {
  question: "q",
  draft: "draft",
  from: "from",
  conversation: "conversation",
} as const;

/** What an entry hands Iris: a question to send at once, or just the page the entry sits on. */
export type IrisRequest = { kind: "question"; text: string } | { kind: "page" };

/**
 * How the Ask Iris page opens: a stored conversation, a question to send, text left in the
 * input, and the page path the conversation is about. A question starts a new conversation.
 */
export interface AskIrisEntry {
  conversationId?: string;
  question?: string;
  draft?: string;
  from?: string;
}

export function askIrisPagePath(entry: AskIrisEntry): string {
  const params = new URLSearchParams();
  for (const key of ["question", "draft", "from", "conversation"] as const) {
    const value = key === "conversation" ? entry.conversationId : entry[key];
    if (value) {
      params.set(ASKIRIS_PARAMS[key], value);
    }
  }
  const query = params.toString();
  return query ? `${ASK_IRIS_PATH}?${query}` : ASK_IRIS_PATH;
}

type SearchParamValue = string | string[] | undefined;

export function resolveAskIrisEntry(params: Record<string, SearchParamValue>): AskIrisEntry {
  const read = (key: string) => firstSearchParam(params[key])?.trim() || undefined;
  const question = read(ASKIRIS_PARAMS.question);
  const conversationId = question ? undefined : read(ASKIRIS_PARAMS.conversation);
  const draft = read(ASKIRIS_PARAMS.draft);
  const from = read(ASKIRIS_PARAMS.from);
  return {
    ...(conversationId ? { conversationId } : {}),
    ...(question ? { question } : {}),
    ...(draft ? { draft } : {}),
    ...(from?.startsWith("/") ? { from } : {}),
  };
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

/** Drops the one-off hand-off params; `conversation` stays, as it names the open conversation. */
export function clearEntryParams(): void {
  const url = new URL(window.location.href);
  for (const param of [ASKIRIS_PARAMS.question, ASKIRIS_PARAMS.draft, ASKIRIS_PARAMS.from]) {
    url.searchParams.delete(param);
  }
  window.history.replaceState(null, "", url.toString());
}
