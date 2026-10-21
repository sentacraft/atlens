import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { gearCardDecline } from "@/lib/ai/gear-request";

function reply(part: Record<string, unknown>): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [{ type: "tool-askForGear", toolCallId: "c1", input: {}, ...part }],
  } as unknown as UIMessage;
}

describe("gearCardDecline", () => {
  it("is null before any card and after a saved one", () => {
    expect(gearCardDecline([])).toBeNull();
    expect(gearCardDecline([reply({ state: "output-available", output: { outcome: "saved" } })])).toBeNull();
  });

  it("tells a skipped form from a guest who chose to tell Iris instead of signing in", () => {
    expect(gearCardDecline([reply({ state: "output-available", output: { outcome: "skipped" } })])).toBe("skipped");
    expect(gearCardDecline([reply({ state: "output-available", output: { outcome: "not_signed_in" } })])).toBe(
      "not_signed_in",
    );
  });

  it("counts a card the user typed past as skipped", () => {
    expect(gearCardDecline([reply({ state: "input-available" })])).toBe("skipped");
  });
});
