import { describe, expect, it } from "vitest";
import { resolveOpening, type OpeningState } from "../opening";

const NOTHING: OpeningState = { shown: null, replyingId: undefined, lastId: undefined };

describe("resolveOpening", () => {
  it("shows the stored conversation asked for", () => {
    expect(resolveOpening({ kind: "conversation", conversationId: "c1" }, { ...NOTHING, replyingId: "c2" })).toEqual({
      kind: "conversation",
      conversationId: "c1",
    });
  });

  it("stays on a reply still being written, keeping a question in the input", () => {
    const state = { shown: { id: "c1", hasMessages: true }, replyingId: "c1", lastId: "c1" };
    expect(resolveOpening({ kind: "open" }, state)).toEqual({ kind: "replying", conversationId: "c1", draft: null });
    expect(resolveOpening({ kind: "question", text: "Which 23mm?" }, state)).toEqual({
      kind: "replying",
      conversationId: "c1",
      draft: "Which 23mm?",
    });
  });

  it("joins a reply running in the tab when the page opens empty", () => {
    expect(resolveOpening({ kind: "open" }, { ...NOTHING, replyingId: "c1", lastId: "c1" })).toEqual({
      kind: "replying",
      conversationId: "c1",
      draft: null,
    });
  });

  it("leaves a conversation with messages for a new one, offering it back", () => {
    const state = { shown: { id: "c1", hasMessages: true }, replyingId: undefined, lastId: "c1" };
    expect(resolveOpening({ kind: "question", text: "Which 23mm?" }, state)).toEqual({
      kind: "fresh",
      startNew: true,
      resumeId: "c1",
      question: "Which 23mm?",
    });
  });

  it("opens the page empty, offering back the conversation last shown in the tab", () => {
    expect(resolveOpening({ kind: "open" }, { ...NOTHING, lastId: "c1" })).toEqual({
      kind: "fresh",
      startNew: false,
      resumeId: "c1",
      question: null,
    });
  });

  it("stays on an empty conversation and offers back no conversation it already shows", () => {
    expect(resolveOpening({ kind: "open" }, { shown: { id: "c2", hasMessages: false }, replyingId: undefined, lastId: "c1" })).toEqual({
      kind: "fresh",
      startNew: false,
      resumeId: "c1",
      question: null,
    });
    expect(resolveOpening({ kind: "open" }, { shown: { id: "c1", hasMessages: false }, replyingId: undefined, lastId: "c1" })).toMatchObject({
      resumeId: null,
    });
    expect(resolveOpening({ kind: "open" }, NOTHING)).toMatchObject({ kind: "fresh", resumeId: null });
  });
});
