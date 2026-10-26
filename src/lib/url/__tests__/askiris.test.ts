// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { askIrisPagePath, clearEntryParams, resolveAskIrisEntry } from "../askiris";

describe("resolveAskIrisEntry", () => {
  it("starts a new conversation by default", () => {
    expect(resolveAskIrisEntry({})).toEqual({});
    expect(resolveAskIrisEntry({ q: "  ", conversation: "" })).toEqual({});
  });

  it("hands off a question to send", () => {
    expect(resolveAskIrisEntry({ q: " Which 23mm? " })).toEqual({ question: "Which 23mm?" });
  });

  it("opens a linked conversation", () => {
    expect(resolveAskIrisEntry({ conversation: ["conv-a", "conv-b"] })).toEqual({ conversationId: "conv-a" });
  });

  it("lets a hand-off question win over a linked conversation", () => {
    expect(resolveAskIrisEntry({ q: "Which 23mm?", conversation: "conv-a" })).toEqual({ question: "Which 23mm?" });
  });
});

describe("askIrisPagePath", () => {
  it("round-trips through resolveAskIrisEntry", () => {
    for (const entry of [
      { conversationId: "conv-a" },
      { question: "Which 23mm?" },
      { question: "Which 23mm?", from: "/en/lenses/x/compare?ids=a,b" },
    ]) {
      const params = Object.fromEntries(new URL(askIrisPagePath(entry), "https://atlens.test").searchParams);
      expect(resolveAskIrisEntry(params)).toEqual(entry);
    }
  });

  it("keeps only a path as the page it was opened from", () => {
    expect(resolveAskIrisEntry({ from: "https://example.com/x" })).toEqual({});
  });

  it("is the bare page for an empty entry", () => {
    expect(askIrisPagePath({})).toBe("/askiris");
  });
});

describe("clearEntryParams", () => {
  it("removes the hand-off question and keeps the conversation and foreign params", () => {
    window.history.replaceState(null, "", "/en/askiris?q=hi&conversation=c1&utm_source=x");

    clearEntryParams();

    expect(window.location.search).toBe("?conversation=c1&utm_source=x");
  });
});
