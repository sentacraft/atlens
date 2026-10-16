// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { askIrisHandoffPath, clearEntryParams, resolveAskIrisEntry } from "../askiris";

describe("resolveAskIrisEntry", () => {
  it("starts a new conversation by default", () => {
    expect(resolveAskIrisEntry({})).toEqual({ kind: "new" });
    expect(resolveAskIrisEntry({ q: "  ", conversation: "" })).toEqual({ kind: "new" });
  });

  it("hands off a question to send", () => {
    expect(resolveAskIrisEntry({ q: " Which 23mm? " })).toEqual({
      kind: "handoff",
      question: { text: "Which 23mm?", mode: "send" },
    });
  });

  it("hands off a draft with the page it came from", () => {
    expect(resolveAskIrisEntry({ draft: "How do these differ?", from: "/en/lenses/x/compare?ids=a,b" })).toEqual({
      kind: "handoff",
      question: { text: "How do these differ?", mode: "draft" },
      from: "/en/lenses/x/compare?ids=a,b",
    });
  });

  it("ignores a from that is not a site path", () => {
    expect(resolveAskIrisEntry({ q: "Hi", from: "https://example.com/" })).toEqual({
      kind: "handoff",
      question: { text: "Hi", mode: "send" },
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
      question: { text: "Which 23mm?", mode: "send" },
    });
  });
});

describe("askIrisHandoffPath", () => {
  it("round-trips through resolveAskIrisEntry", () => {
    const path = askIrisHandoffPath({ text: "What is this lens for?", mode: "draft" }, "/zh/lenses/x/xf-56");
    const params = Object.fromEntries(new URL(path, "https://atlens.test").searchParams);

    expect(resolveAskIrisEntry(params)).toEqual({
      kind: "handoff",
      question: { text: "What is this lens for?", mode: "draft" },
      from: "/zh/lenses/x/xf-56",
    });
  });
});

describe("clearEntryParams", () => {
  it("removes the entry params and keeps foreign ones", () => {
    window.history.replaceState(null, "", "/en/askiris?q=hi&draft=d&from=%2Fen&conversation=c1&utm_source=x");

    clearEntryParams();

    expect(window.location.search).toBe("?utm_source=x");
  });
});
