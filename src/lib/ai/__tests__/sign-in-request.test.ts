import { describe, expect, it } from "vitest";
import { buildLensTools } from "../tools";
import { ASK_TO_SIGN_IN, signInCancelled, signInOutputSchema } from "../sign-in-request";
import type { UIMessage } from "ai";

const tools = buildLensTools("X", "en", (brand) => brand, { favorites: async () => null, gear: { known: false, reason: "guest" }, reviews: async () => new Map() }, new Set());

describe("account sign-in interaction", () => {
  it("has no server execution or model-supplied identity", () => {
    expect(tools).not.toHaveProperty("myGear");
    expect(tools[ASK_TO_SIGN_IN].execute).toBeUndefined();
    expect(signInOutputSchema.parse({ outcome: "signed_in" })).toEqual({ outcome: "signed_in" });
    expect(signInOutputSchema.safeParse({ outcome: "signed_in", userId: "forged" }).success).toBe(false);
  });

  it("recognizes cancellation, not success, as a reason to stop offering sign-in", () => {
    const history = (outcome: string): UIMessage[] => [{ id: "a", role: "assistant", parts: [{ type: "tool-askToSignIn", toolCallId: "s", state: "output-available", input: {}, output: { outcome } }] }];
    expect(signInCancelled(history("cancelled"))).toBe(true);
    expect(signInCancelled(history("signed_in"))).toBe(false);
    expect(signInCancelled([...history("cancelled"), { id: "new", role: "user", parts: [{ type: "text", text: "Try signing in again" }] }])).toBe(false);
    expect(signInCancelled([])).toBe(false);
  });
});
