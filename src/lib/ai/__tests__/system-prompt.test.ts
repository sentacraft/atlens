import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { languagePrompt, systemPrompt } from "../system-prompt";

describe("systemPrompt", () => {
  it("lists the action buttons Iris may place, labelled as the site names them in the user's language", () => {
    expect(systemPrompt("X", "zh")).toContain(`[${zh.Nav.feedback}](action:feedback)`);
    // Sign-in is the sign-in card's to offer; given the link, models put it in replies unasked.
    expect(systemPrompt("X", "zh")).not.toContain("action:signIn");
    expect(systemPrompt("X", "en")).toContain(`[${en.Nav.feedback}](action:feedback)`);
    expect(systemPrompt("X", "en")).not.toMatch(/\{\w+\.\w+\}/);
  });
});

describe("languagePrompt", () => {
  it("pins all user-facing outputs to the user's language with a locale fallback in English", () => {
    const enPrompt = languagePrompt("en");
    const zhPrompt = languagePrompt("zh");
    expect(enPrompt).toContain("recommendation card reasons");
    expect(enPrompt).toContain("table captions");
    expect(enPrompt).toContain("choice cards");
    expect(enPrompt).toContain("do not switch to Chinese");
    expect(enPrompt).toContain("English");
    expect(zhPrompt).toContain("Simplified Chinese");
    expect(enPrompt + zhPrompt).not.toMatch(/[\u4e00-\u9fff]/);
  });
});
