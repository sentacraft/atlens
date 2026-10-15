import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { gearRequestDeclined } from "@/lib/ai/gear-request";

function reply(part: Record<string, unknown>): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [{ type: "tool-askForGear", toolCallId: "c1", input: {}, ...part }],
  } as UIMessage;
}

describe("gearRequestDeclined", () => {
  it("is false before any card and after a saved one", () => {
    expect(gearRequestDeclined([])).toBe(false);
    expect(gearRequestDeclined([reply({ state: "output-available", output: { outcome: "saved" } })])).toBe(false);
  });

  it("is true once a card was skipped or the user chose not to sign in", () => {
    expect(gearRequestDeclined([reply({ state: "output-available", output: { outcome: "skipped" } })])).toBe(true);
    expect(gearRequestDeclined([reply({ state: "output-available", output: { outcome: "not_signed_in" } })])).toBe(
      true,
    );
  });

  it("is true once the user typed past a card without answering it", () => {
    expect(gearRequestDeclined([reply({ state: "input-available" })])).toBe(true);
  });
});
