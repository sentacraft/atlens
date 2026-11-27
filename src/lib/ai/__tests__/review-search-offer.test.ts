import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { offeredReviewRefs } from "@/lib/ai/review-search-offer";
import { reviewSearchPrompt } from "@/lib/ai/system-prompt";

const message = (role: UIMessage["role"], text: string): UIMessage => ({ id: text, role, parts: [{ type: "text", text }] });

describe("offeredReviewRefs", () => {
  it("is empty until a reply links review searches", () => {
    expect(offeredReviewRefs([message("user", "Which one?"), message("assistant", "I lean towards [A](lens:abc).")])).toEqual([]);
  });

  it("collects the refs of every review link, deduped in order of first appearance", () => {
    expect(
      offeredReviewRefs([
        message("assistant", "Have a look at [some reviews](reviews:abc,def) first."),
        message("assistant", "Then [these](reviews:def,ghi)."),
      ]),
    ).toEqual(["abc", "def", "ghi"]);
  });

  it("reads refs the model separated with a space or a full-width comma", () => {
    expect(offeredReviewRefs([message("assistant", "See [these](reviews:abc, def) and [those](reviews:ghi，abc).")])).toEqual(["abc", "def", "ghi"]);
  });

  it("ignores a user who typed the syntax", () => {
    expect(offeredReviewRefs([message("user", "[x](reviews:abc)")])).toEqual([]);
  });
});

describe("reviewSearchPrompt", () => {
  it("always offers the link", () => {
    expect(reviewSearchPrompt([])).toContain("reviews:ref1,ref2");
    expect(reviewSearchPrompt(["abc", "def"])).toContain("reviews:ref1,ref2");
  });

  it("lists the refs already offered without CJK characters", () => {
    const fresh = reviewSearchPrompt([]);
    const repeat = reviewSearchPrompt(["abc", "def"]);
    expect(fresh).not.toContain("already been given");
    expect(repeat).toContain("already been given");
    expect(repeat).toContain("abc, def");
    expect(fresh + repeat).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
