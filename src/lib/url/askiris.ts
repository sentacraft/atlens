import { firstSearchParam } from "@/lib/url/search-params";
import { ASK_IRIS_PATH } from "@/lib/url/routes";

export const ASKIRIS_PARAMS = {
  query: "q",
  draft: "draft",
  from: "from",
  conversation: "conversation",
} as const;

/** A question handed to Iris from elsewhere: sent at once, or left in the input to edit. */
export interface IrisQuestion {
  text: string;
  mode: "send" | "draft";
}

/** Opens a conversation on the Ask Iris page. */
export function askIrisConversationPath(conversationId: string): string {
  return `${ASK_IRIS_PATH}?${new URLSearchParams({ [ASKIRIS_PARAMS.conversation]: conversationId })}`;
}

/** Opens Ask Iris with `question`; `from` is the page path the conversation is about. */
export function askIrisHandoffPath(question: IrisQuestion, from?: string): string {
  const params = new URLSearchParams({
    [question.mode === "send" ? ASKIRIS_PARAMS.query : ASKIRIS_PARAMS.draft]: question.text,
  });
  if (from) {
    params.set(ASKIRIS_PARAMS.from, from);
  }
  return `${ASK_IRIS_PATH}?${params}`;
}

export type AskIrisEntry =
  | { kind: "new" }
  | { kind: "handoff"; question: IrisQuestion; from?: string }
  | { kind: "resume"; conversationId: string };

type SearchParamValue = string | string[] | undefined;

export function resolveAskIrisEntry(params: Record<string, SearchParamValue>): AskIrisEntry {
  const query = firstSearchParam(params[ASKIRIS_PARAMS.query])?.trim();
  const draft = firstSearchParam(params[ASKIRIS_PARAMS.draft])?.trim();
  const question: IrisQuestion | undefined = query
    ? { text: query, mode: "send" }
    : draft
      ? { text: draft, mode: "draft" }
      : undefined;
  if (question) {
    const from = firstSearchParam(params[ASKIRIS_PARAMS.from]);
    return { kind: "handoff", question, ...(from?.startsWith("/") ? { from } : {}) };
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
  for (const param of Object.values(ASKIRIS_PARAMS)) {
    url.searchParams.delete(param);
  }
  window.history.replaceState(null, "", url.toString());
}
