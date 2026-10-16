import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { systemPrompt } from "../system-prompt";

describe("systemPrompt", () => {
  it("lists every action button, labelled as the site names it in the user's language", () => {
    expect(systemPrompt("X", "zh")).toContain(`[${zh.Nav.feedback}](action:feedback)`);
    expect(systemPrompt("X", "zh")).toContain(`[${zh.Auth.signIn}](action:signIn)`);
    expect(systemPrompt("X", "en")).toContain(`[${en.Nav.feedback}](action:feedback)`);
    expect(systemPrompt("X", "en")).not.toMatch(/\{\w+\.\w+\}/);
  });
});
