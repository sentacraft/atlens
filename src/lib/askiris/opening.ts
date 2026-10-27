import type { IrisRequest } from "@/lib/url/askiris";

/** What an opening of Iris hands in: nothing, a question to send, or a stored conversation to show. */
export type OpeningRequest = IrisRequest | { kind: "open" };

/** The tab's chats as an opening finds them. */
export interface OpeningState {
  /** The conversation on screen and whether it has messages; the panel keeps its chat between openings, the page starts empty. */
  shown: { id: string; hasMessages: boolean } | null;
  /** A conversation still replying in this tab. */
  replyingId: string | undefined;
  /** The conversation last shown with messages in this tab. */
  lastId: string | undefined;
}

/**
 * What Iris shows on opening:
 * - `conversation`: a stored conversation, the one asked for or the one left last.
 * - `stay`: the conversation already on screen.
 * - `replying`: a reply still being written; a question waits in the input rather than cutting in.
 * - `fresh`: a new conversation for a question (`startNew` when the one on screen has messages),
 *   offering the last one back.
 */
export type Opening =
  | { kind: "conversation"; conversationId: string }
  | { kind: "stay" }
  | { kind: "replying"; conversationId: string; draft: string | null }
  | { kind: "fresh"; startNew: boolean; resumeId: string | null; question: string | null };

/**
 * The one rule for every opening, in the side panel and on the Ask Iris page alike: Iris picks up
 * where it was left, and a question handed in starts a conversation of its own.
 */
export function resolveOpening(request: OpeningRequest, state: OpeningState): Opening {
  if (request.kind === "conversation") {
    return { kind: "conversation", conversationId: request.conversationId };
  }
  const question = request.kind === "question" ? request.text : null;
  if (state.replyingId) {
    return { kind: "replying", conversationId: state.replyingId, draft: question };
  }
  if (!question) {
    if (state.shown) {
      return { kind: "stay" };
    }
    return state.lastId ? { kind: "conversation", conversationId: state.lastId } : { kind: "fresh", startNew: false, resumeId: null, question: null };
  }
  const startNew = state.shown?.hasMessages ?? false;
  const stays = startNew ? null : state.shown?.id;
  const resumeId = state.lastId && state.lastId !== stays ? state.lastId : null;
  return { kind: "fresh", startNew, resumeId, question };
}
