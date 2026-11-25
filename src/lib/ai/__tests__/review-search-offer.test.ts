import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { reviewSearchOffered } from "@/lib/ai/review-search-offer";
import { reviewSearchPrompt } from "@/lib/ai/system-prompt";

const message = (role: UIMessage["role"], text: string): UIMessage => ({ id: text, role, parts: [{ type: "text", text }] });

describe("reviewSearchOffered", () => {
  it("is false until a reply links review searches", () => {
    expect(reviewSearchOffered([message("user", "Which one?"), message("assistant", "I lean towards [A](lens:abc).")])).toBe(false);
  });

  it("is true once a reply has linked them", () => {
    expect(reviewSearchOffered([message("assistant", "Have a look at [some reviews](reviews:abc,def) first.")])).toBe(true);
  });

  it("ignores a user who typed the syntax", () => {
    expect(reviewSearchOffered([message("user", "[x](reviews:abc)")])).toBe(false);
  });
});

describe("reviewSearchPrompt", () => {
  it("is offered until a reply in the conversation has used it", () => {
    expect(reviewSearchPrompt(false)).toContain("reviews:");
    expect(reviewSearchPrompt(true)).toBeNull();
  });
});
