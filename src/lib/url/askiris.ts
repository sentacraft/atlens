import { firstSearchParam } from "@/lib/url/search-params";
import { ASK_IRIS_PATH } from "@/lib/url/routes";

export const ASKIRIS_PARAMS = {
  question: "q",
  conversation: "conversation",
  // On any page but the Ask Iris page: the conversation to reopen in the panel on load.
  panelConversation: "iris",
} as const;

/** What an opening hands Iris: a question to send at once, or a stored conversation to show. */
export type IrisRequest = { kind: "question"; text: string } | { kind: "conversation"; conversationId: string };

/** Where Iris was opened from: the nav, the home hero, or a page's entry. */
export type IrisEntryPoint = "nav" | "home" | "alternatives" | "browse" | "empty" | "compare" | "sign_in";

/** How the Ask Iris page opens: a stored conversation, or a question that starts a new one. */
export interface AskIrisEntry {
  conversationId?: string;
  question?: string;
}

export function askIrisPagePath(entry: AskIrisEntry): string {
  const params = new URLSearchParams();
  for (const key of ["question", "conversation"] as const) {
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
  return {
    ...(conversationId ? { conversationId } : {}),
    ...(question ? { question } : {}),
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

/**
 * This page, set to reopen the panel on `conversationId` when it loads: where a sign-in that
 * leaves the page (Google) brings the user back, so a turn paused for it carries on.
 */
export function panelReturnUrl(conversationId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(ASKIRIS_PARAMS.panelConversation, conversationId);
  return url.toString();
}

/** Reads and drops the panel's conversation param, so a reload does not reopen it again. */
export function takePanelConversationParam(): string | null {
  const url = new URL(window.location.href);
  const conversationId = url.searchParams.get(ASKIRIS_PARAMS.panelConversation) || null;
  if (conversationId) {
    url.searchParams.delete(ASKIRIS_PARAMS.panelConversation);
    window.history.replaceState(null, "", url.toString());
  }
  return conversationId;
}

/** Drops the one-off question param; `conversation` stays, as it names the open conversation. */
export function clearEntryParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(ASKIRIS_PARAMS.question);
  window.history.replaceState(null, "", url.toString());
}
