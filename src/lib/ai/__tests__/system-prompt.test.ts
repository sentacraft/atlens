import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { systemPrompt } from "../system-prompt";

describe("systemPrompt", () => {
  it("lists the action buttons Iris may place, labelled as the site names them in the user's language", () => {
    expect(systemPrompt("X", "zh")).toContain(`[${zh.Nav.feedback}](action:feedback)`);
    // Sign-in is the sign-in card's to offer; given the link, models put it in replies unasked.
    expect(systemPrompt("X", "zh")).not.toContain("action:signIn");
    expect(systemPrompt("X", "en")).toContain(`[${en.Nav.feedback}](action:feedback)`);
    expect(systemPrompt("X", "en")).not.toMatch(/\{\w+\.\w+\}/);
  });
});
