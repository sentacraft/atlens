import { describe, expect, it } from "vitest";
import {
  canResolveReplyAction,
  dedupeReplyActions,
  extractReplyActions,
  replyActionKey,
} from "@/lib/askiris/reply-actions";
import type { LensLinkIndex } from "@/lib/ai/lens-ref";

const LENSES: LensLinkIndex = {
  abc12: { id: "lens-a", mount: "X", name: "Lens A", review: { en: "Lens A" } },
  def34: { id: "lens-b", mount: "X", name: "Lens B", review: { en: "Lens B" } },
  gfx99: { id: "lens-g", mount: "G", name: "Lens G", review: { en: "Lens G" } },
};

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

  it("cleans trailing colon-introduced reviews and compare links in English and Chinese", () => {
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

    const emptyAfterColon = "Check outside reviews: [](reviews:abc12,def34)";
    expect(extractReplyActions(emptyAfterColon)).toEqual({
      markdown: "Check outside reviews.",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });

    const zhEmptyAfterColon = "建议对比参数：[](compare:abc12,def34)";
    expect(extractReplyActions(zhEmptyAfterColon)).toEqual({
      markdown: "建议对比参数。",
      actions: [{ kind: "compare", refs: ["abc12", "def34"] }],
    });
  });

  it("handles trailing bare links, wrapped parentheses, multiple colon links, and list prefixes", () => {
    expect(extractReplyActions("Check reviews [](reviews:abc12,def34).")).toEqual({
      markdown: "Check reviews.",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });

    expect(extractReplyActions("Great choice! [](reviews:abc12,def34)")).toEqual({
      markdown: "Great choice!",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });

    expect(extractReplyActions("值得看看（[](reviews:abc12,def34)）。")).toEqual({
      markdown: "值得看看。",
      actions: [{ kind: "reviews", refs: ["abc12", "def34"] }],
    });

    expect(extractReplyActions("Check reviews: [](reviews:abc12,def34) [](compare:abc12,def34).")).toEqual({
      markdown: "Check reviews.",
      actions: [
        { kind: "reviews", refs: ["abc12", "def34"] },
        { kind: "compare", refs: ["abc12", "def34"] },
      ],
    });

    const bulleted = ["Pick one:", "- [](reviews:abc12,def34)", "1. [](compare:abc12,def34)"].join("\n");
    expect(extractReplyActions(bulleted)).toEqual({
      markdown: "Pick one:",
      actions: [
        { kind: "reviews", refs: ["abc12", "def34"] },
        { kind: "compare", refs: ["abc12", "def34"] },
      ],
    });
  });

  it("preserves unrelated whitespace, nested lists, code blocks, hard breaks, and dot literals", () => {
    const untouched = [
      "Top item",
      "    - nested item",
      "",
      "line one  ",
      "line two",
      "",
      "Shoot the .RAF files which is .3 stops brighter.",
      "",
      "```md",
      "    indented   code .",
      "[](reviews:abc12,def34)",
      "```",
    ].join("\n");

    expect(extractReplyActions(untouched)).toEqual({
      markdown: untouched,
      actions: [],
    });
  });

  it("does not strip soft-wrapped mid-paragraph labelled links or mid-sentence empty links", () => {
    const softWrapped = [
      "Compare this with the one in",
      "[this comparison](compare:abc12,def34)",
      "which shows corner sharpness.",
    ].join("\n");
    expect(extractReplyActions(softWrapped)).toEqual({
      markdown: softWrapped,
      actions: [],
    });

    const midSentence = "See [](reviews:abc12,def34) for samples.";
    expect(extractReplyActions(midSentence)).toEqual({
      markdown: midSentence,
      actions: [],
    });
  });

  it("leaves unresolvable or invalid action links in prose when canResolve is provided", () => {
    const canResolve = (action: Parameters<typeof canResolveReplyAction>[0]) => canResolveReplyAction(action, LENSES);
    const input = [
      "Check reviews: [](reviews:unknown).",
      "[](compare:abc12,gfx99)",
      "[](compare:abc12)",
      "[](reviews:a,b,c,d)",
    ].join("\n");

    expect(extractReplyActions(input, { canResolve })).toEqual({
      markdown: input,
      actions: [],
    });
  });

  it("hides incomplete streaming trailing action syntax until the closing parenthesis arrives", () => {
    const partial = ["Both primes are close.", "", "[](reviews:abc12,def3"].join("\n");
    expect(extractReplyActions(partial, { streaming: true })).toEqual({
      markdown: "Both primes are close.",
      actions: [],
    });

    const inlinePartial = "Look at outside reviews. [](compare:abc12,def";
    expect(extractReplyActions(inlinePartial, { streaming: true })).toEqual({
      markdown: "Look at outside reviews.",
      actions: [],
    });
  });

  it("deduplicates actions order-independently across a message and across parts", () => {
    const input = [
      "Both primes sit near the same price.",
      "[](compare:abc12,def34)",
      "[](compare:def34,abc12)",
    ].join("\n");

    expect(extractReplyActions(input)).toEqual({
      markdown: "Both primes sit near the same price.",
      actions: [{ kind: "compare", refs: ["abc12", "def34"] }],
    });

    expect(replyActionKey({ kind: "compare", refs: ["def34", "abc12"] })).toBe("compare:abc12,def34");
    expect(
      dedupeReplyActions([
        { kind: "reviews", refs: ["def34", "abc12"] },
        { kind: "reviews", refs: ["abc12", "def34"] },
        { kind: "compare", refs: ["abc12", "def34"] },
      ]),
    ).toEqual([
      { kind: "reviews", refs: ["def34", "abc12"] },
      { kind: "compare", refs: ["abc12", "def34"] },
    ]);
  });
});
