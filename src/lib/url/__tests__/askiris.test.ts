// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { clearEntryParams, resolveAskIrisEntry } from "../askiris";

describe("resolveAskIrisEntry", () => {
  it("starts a new conversation by default", () => {
    expect(resolveAskIrisEntry({})).toEqual({ kind: "new" });
    expect(resolveAskIrisEntry({ q: "  ", conversation: "" })).toEqual({ kind: "new" });
  });

  it("hands off a query", () => {
    expect(resolveAskIrisEntry({ q: " Which 23mm? " })).toEqual({
      kind: "handoff",
      query: "Which 23mm?",
    });
  });

  it("resumes a linked conversation", () => {
    expect(resolveAskIrisEntry({ conversation: ["conv-a", "conv-b"] })).toEqual({
      kind: "resume",
      conversationId: "conv-a",
    });
  });

  it("lets a hand-off query win over a linked conversation", () => {
    expect(resolveAskIrisEntry({ q: "Which 23mm?", conversation: "conv-a" })).toEqual({
      kind: "handoff",
      query: "Which 23mm?",
    });
  });
});

describe("clearEntryParams", () => {
  it("removes the entry params and keeps foreign ones", () => {
    window.history.replaceState(null, "", "/en/askiris?q=hi&conversation=c1&utm_source=x");

    clearEntryParams();

    expect(window.location.search).toBe("?utm_source=x");
  });
});
