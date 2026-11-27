import { describe, expect, it } from "vitest";
import type { ModelMessage } from "ai";
import { createPrepareStep, hasPresentedLenses } from "../prepare-step";
import { ASK_CHOICES } from "../choice-request";

const BASE_TOOLS = ["queryLenses", "recommendLenses", "listLenses", ASK_CHOICES] as const;
const MESSAGES: ModelMessage[] = [{ role: "user", content: "Best portrait lens?" }];
const REMINDER = "Reply in English.";

describe("hasPresentedLenses", () => {
  it("detects completed recommendLenses or listLenses tool results", () => {
    expect(hasPresentedLenses([])).toBe(false);
    expect(hasPresentedLenses([{ content: [{ type: "tool-result", toolName: "queryLenses" }] }])).toBe(false);
    expect(hasPresentedLenses([{ content: [{ type: "tool-result", toolName: "recommendLenses" }] }])).toBe(true);
    expect(hasPresentedLenses([{ content: [{ type: "tool-result", toolName: "listLenses" }] }])).toBe(true);
  });
});

describe("createPrepareStep", () => {
  const prepareStep = createPrepareStep({
    activeTools: BASE_TOOLS,
    stepBudget: 8,
    languageReminder: REMINDER,
  });

  it("returns undefined on step 0", () => {
    expect(prepareStep({ stepNumber: 0, steps: [], messages: MESSAGES })).toBeUndefined();
  });

  it("appends the language reminder after step 0 without altering tools on step 1", () => {
    const result = prepareStep({
      stepNumber: 1,
      steps: [{ content: [{ type: "tool-result", toolName: "queryLenses" }] }],
      messages: MESSAGES,
    });
    expect(result).toEqual({
      messages: [...MESSAGES, { role: "system", content: REMINDER }],
    });
  });

  it("drops askChoices at step >= 2 when no lenses have been presented yet", () => {
    const result = prepareStep({
      stepNumber: 2,
      steps: [{ content: [{ type: "tool-result", toolName: "queryLenses" }] }],
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
