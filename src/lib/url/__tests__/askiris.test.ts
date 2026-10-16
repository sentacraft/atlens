// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { askIrisPagePath, clearEntryParams, resolveAskIrisEntry } from "../askiris";

describe("resolveAskIrisEntry", () => {
  it("starts a new conversation by default", () => {
    expect(resolveAskIrisEntry({})).toEqual({});
    expect(resolveAskIrisEntry({ q: "  ", conversation: "" })).toEqual({});
  });

  it("hands off a question to send, with the page it came from", () => {
    expect(resolveAskIrisEntry({ q: " Which 23mm? ", from: "/en/lenses/x/compare?ids=a,b" })).toEqual({
      question: "Which 23mm?",
      from: "/en/lenses/x/compare?ids=a,b",
    });
  });

  it("resumes a linked conversation with its unsent input", () => {
    expect(resolveAskIrisEntry({ conversation: ["conv-a", "conv-b"], draft: "And the 50mm?" })).toEqual({
      conversationId: "conv-a",
      draft: "And the 50mm?",
    });
  });

  it("lets a hand-off question win over a linked conversation", () => {
    expect(resolveAskIrisEntry({ q: "Which 23mm?", conversation: "conv-a" })).toEqual({ question: "Which 23mm?" });
  });

  it("ignores a from that is not a site path", () => {
    expect(resolveAskIrisEntry({ q: "Hi", from: "https://example.com/" })).toEqual({ question: "Hi" });
  });
});

describe("askIrisPagePath", () => {
  it("round-trips through resolveAskIrisEntry", () => {
    const entry = { conversationId: "conv-a", draft: "And the 50mm?", from: "/zh/lenses/x/xf-56" };
    const params = Object.fromEntries(new URL(askIrisPagePath(entry), "https://atlens.test").searchParams);

    expect(resolveAskIrisEntry(params)).toEqual(entry);
  });

  it("is the bare page for an empty entry", () => {
    expect(askIrisPagePath({})).toBe("/askiris");
  });
});

describe("clearEntryParams", () => {
  it("removes the hand-off params and keeps the conversation and foreign ones", () => {
    window.history.replaceState(null, "", "/en/askiris?q=hi&draft=d&from=%2Fen&conversation=c1&utm_source=x");

    clearEntryParams();

    expect(window.location.search).toBe("?conversation=c1&utm_source=x");
  });
});
