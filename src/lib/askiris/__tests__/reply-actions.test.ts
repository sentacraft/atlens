import { describe, expect, it } from "vitest";
import { extractReplyActions } from "@/lib/askiris/reply-actions";

describe("extractReplyActions", () => {
  it("extracts standalone empty-label reviews and compare links below the prose", () => {
    const input = [
      "Both primes sit near the same price.",
      "",
      "[](reviews:abc12,def34)",
      "[](compare:abc12,def34)",
    ].join("\n");

    expect(extractReplyActions(input)).toEqual({
      markdown: "Both primes sit near the same price.",
      actions: [
        { kind: "reviews", refs: ["abc12", "def34"] },
        { kind: "compare", refs: ["abc12", "def34"] },
      ],
    });
  });

  it("cleans legacy trailing colon-introduced reviews links in English and Chinese", () => {
    const en = "Before you commit, it is worth reading outside reviews: [reviews for the 23mm f/2.8, 23mm f/2 and 27mm f/2.8](reviews:abc12,def34) .";
    expect(extractReplyActions(en)).toEqual({
      markdown: "Before you commit, it is worth reading outside reviews.",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });

    const zh = "建议下单前再看看第三方评测和实拍样片：[对比评测与样片](reviews:abc12, def34) 。";
    expect(extractReplyActions(zh)).toEqual({
      markdown: "建议下单前再看看第三方评测和实拍样片。",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });
  });

  it("keeps non-empty mid-sentence links inline so legacy phrasing stays grammatical", () => {
    const text = "Have a look at [some reviews](reviews:abc12,def34) first.";
    expect(extractReplyActions(text)).toEqual({
      markdown: text,
      actions: [],
    });
  });

  it("deduplicates identical actions and leaves invalid action links untouched", () => {
    const input = [
      "Check reviews [](reviews:abc12,def34).",
      "[](reviews:abc12,def34)",
      "[](compare:abc12)",
      "[](reviews:a,b,c,d)",
    ].join("\n");

    expect(extractReplyActions(input)).toEqual({
      markdown: "Check reviews.\n[](compare:abc12)\n[](reviews:a,b,c,d)",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });
  });
});
