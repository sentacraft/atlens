import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { normalizeLegacyGearCalls } from "../legacy-gear-call";

function history(state: string, approved?: boolean): UIMessage[] {
  return [{ id: "a", role: "assistant", metadata: { turnId: "u" }, parts: [
    { type: "text", text: "Original text" },
    { type: "tool-myGear", toolCallId: "old", input: {}, state, ...(approved === undefined ? {} : { approval: { id: "approval", approved } }) },
    { type: "tool-askChoices", toolCallId: "choice", input: { questions: [] }, state: "input-available" },
  ] }] as UIMessage[];
}

describe("retired gear call history", () => {
  it.each(["input-available", "approval-requested", "approval-responded"])("resumes %s through the current sign-in interaction", (state) => {
    const original = history(state, true);
    const result = normalizeLegacyGearCalls(original);
    expect(result[0].parts[1]).toEqual({ type: "tool-askToSignIn", toolCallId: "old", input: {}, state: "input-available" });
    expect(result[0].parts[0]).toBe(original[0].parts[0]);
    expect(result[0].parts[2]).toBe(original[0].parts[2]);
    expect(result[0].metadata).toBe(original[0].metadata);
    expect(normalizeLegacyGearCalls(result)).toEqual(result);
  });

  it("keeps a declined old approval terminal", () => {
    expect(normalizeLegacyGearCalls(history("approval-responded", false))[0].parts[1]).toMatchObject({ state: "output-available", output: { outcome: "cancelled" } });
  });

  it("converts an old client's approval response to a signal, not account data", () => {
    expect(normalizeLegacyGearCalls(history("approval-responded", true), { incoming: true })[0].parts[1]).toEqual({ type: "tool-askToSignIn", toolCallId: "old", input: {}, state: "output-available", output: { outcome: "signed_in" } });
  });

  it.each(["output-available", "output-error", "output-denied"])("preserves completed %s contents", (state) => {
    const original = history(state);
    expect(normalizeLegacyGearCalls(original)[0].parts[1]).toBe(original[0].parts[1]);
  });
});
