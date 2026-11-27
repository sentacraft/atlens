import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import { createPrepareStep, hasCatalogResearch, hasPresentedLenses } from "../prepare-step";
import { ASK_CHOICES } from "../choice-request";

const BASE_TOOLS = ["queryLenses", "recommendLenses", "listLenses", ASK_CHOICES] as const;
const MESSAGES: ModelMessage[] = [{ role: "user", content: "Best portrait lens?" }];
const ZH_MESSAGES: ModelMessage[] = [{ role: "user", content: "推荐一支拍人像的镜头" }];
const REMINDER = "Reply in English.";

describe("hasPresentedLenses", () => {
  it("detects completed recommendLenses or listLenses tool results", () => {
    expect(hasPresentedLenses([])).toBe(false);
    expect(hasPresentedLenses([{ content: [{ type: "tool-result", toolName: "queryLenses" }] }])).toBe(false);
    expect(hasPresentedLenses([{ content: [{ type: "tool-result", toolName: "recommendLenses" }] }])).toBe(true);
    expect(hasPresentedLenses([{ content: [{ type: "tool-result", toolName: "listLenses" }] }])).toBe(true);
  });
});

describe("hasCatalogResearch", () => {
  it("detects completed catalog lookup tool results", () => {
    expect(hasCatalogResearch([])).toBe(false);
    expect(hasCatalogResearch([{ content: [{ type: "tool-result", toolName: "myGear" }] }])).toBe(false);
    expect(hasCatalogResearch([{ content: [{ type: "tool-result", toolName: "queryLenses" }] }])).toBe(true);
    expect(hasCatalogResearch([{ content: [{ type: "tool-result", toolName: "searchLensByName" }] }])).toBe(true);
  });
});

describe("createPrepareStep", () => {
  const prepareStep = createPrepareStep({
    activeTools: BASE_TOOLS,
    stepBudget: 8,
    languageReminder: REMINDER,
  });

  it("appends the resolved language reminder on step 0 without altering tools", () => {
    expect(prepareStep({ stepNumber: 0, steps: [], messages: MESSAGES })).toEqual({
      messages: [...MESSAGES, { role: "system", content: REMINDER }],
    });

    const zhResult = prepareStep({ stepNumber: 0, steps: [], messages: ZH_MESSAGES });
    expect(zhResult?.activeTools).toBeUndefined();
    expect(zhResult?.messages?.at(-1)).toEqual({
      role: "system",
      content: expect.stringContaining("Simplified Chinese from the very first word"),
    });
  });

  it("keeps askChoices at step 1 after non-catalog calls like myGear", () => {
    const result = prepareStep({
      stepNumber: 1,
      steps: [{ content: [{ type: "tool-result", toolName: "myGear" }] }],
      messages: MESSAGES,
    });
    expect(result).toEqual({
      messages: [...MESSAGES, { role: "system", content: REMINDER }],
    });
  });

  it("drops askChoices at step 1 after catalog research when no lenses have been presented", () => {
    const result = prepareStep({
      stepNumber: 1,
      steps: [{ content: [{ type: "tool-result", toolName: "queryLenses" }] }],
      messages: MESSAGES,
    });
    expect(result?.activeTools).toEqual(["queryLenses", "recommendLenses", "listLenses"]);
    expect(result?.messages?.at(-1)).toEqual({ role: "system", content: REMINDER });
  });

  it("drops askChoices at step >= 2 when no lenses have been presented yet", () => {
    const result = prepareStep({
      stepNumber: 2,
      steps: [{ content: [{ type: "tool-result", toolName: "myGear" }] }],
      messages: MESSAGES,
    });
    expect(result?.activeTools).toEqual(["queryLenses", "recommendLenses", "listLenses"]);
    expect(result?.messages?.at(-1)).toEqual({ role: "system", content: REMINDER });
  });

  it("keeps askChoices at step >= 2 once recommendLenses or listLenses succeeded", () => {
    const result = prepareStep({
      stepNumber: 2,
      steps: [{ content: [{ type: "tool-result", toolName: "recommendLenses" }] }],
      messages: MESSAGES,
    });
    expect(result?.activeTools).toBeUndefined();
    expect(result?.messages?.at(-1)).toEqual({ role: "system", content: REMINDER });
  });

  it("forces toolChoice none at stepBudget - 1 or after repeated tool failure", () => {
    expect(prepareStep({ stepNumber: 7, steps: [], messages: MESSAGES })).toEqual({
      toolChoice: "none",
      messages: [...MESSAGES, { role: "system", content: REMINDER }],
    });

    const repeatedError = { type: "tool-error", toolName: "queryLenses", input: { queries: [] } };
    expect(
      prepareStep({
        stepNumber: 2,
        steps: [{ content: [repeatedError] }, { content: [repeatedError] }],
        messages: MESSAGES,
      }),
    ).toEqual({
      toolChoice: "none",
      messages: [...MESSAGES, { role: "system", content: REMINDER }],
    });
  });
});
