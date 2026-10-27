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

  it("picks up the conversation left last when the page opens with nothing to hand in", () => {
    expect(resolveOpening({ kind: "open" }, { ...NOTHING, lastId: "c1" })).toEqual({ kind: "conversation", conversationId: "c1" });
    expect(resolveOpening({ kind: "open" }, NOTHING)).toEqual({ kind: "fresh", startNew: false, resumeId: null, question: null });
  });

  it("keeps the panel's conversation when it reopens with nothing to hand in", () => {
    expect(resolveOpening({ kind: "open" }, { shown: { id: "c1", hasMessages: true }, replyingId: undefined, lastId: "c1" })).toEqual({
      kind: "stay",
    });
    expect(resolveOpening({ kind: "open" }, { shown: { id: "c2", hasMessages: false }, replyingId: undefined, lastId: "c1" })).toEqual({
      kind: "stay",
    });
  });

  it("gives a question a new conversation, offering the last one back", () => {
    expect(
      resolveOpening({ kind: "question", text: "Which 23mm?" }, { shown: { id: "c1", hasMessages: true }, replyingId: undefined, lastId: "c1" }),
    ).toEqual({ kind: "fresh", startNew: true, resumeId: "c1", question: "Which 23mm?" });
    expect(resolveOpening({ kind: "question", text: "Which 23mm?" }, { ...NOTHING, lastId: "c1" })).toEqual({
      kind: "fresh",
      startNew: false,
      resumeId: "c1",
      question: "Which 23mm?",
    });
  });

  it("asks an empty conversation on screen the question, offering back no conversation it already shows", () => {
    expect(
      resolveOpening({ kind: "question", text: "Which 23mm?" }, { shown: { id: "c1", hasMessages: false }, replyingId: undefined, lastId: "c1" }),
    ).toMatchObject({ startNew: false, resumeId: null });
  });
});
