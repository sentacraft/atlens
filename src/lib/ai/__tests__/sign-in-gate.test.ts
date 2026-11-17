import { describe, expect, it } from "vitest";
import { signInApproval, signInDeclined, signInGate } from "../sign-in-gate";
import type { UIMessage } from "ai";

describe("the sign-in gate", () => {
  it.each(["approval-responded", "output-denied"] as const)("keeps a %s denial scoped to its question", (state) => {
    const denied: UIMessage = { id: "a", role: "assistant", parts: [{ type: "tool-myGear", toolCallId: "g", input: {}, state, approval: { id: "approval", approved: false } }] };
    expect(signInDeclined([denied])).toBe(true);
    expect(signInDeclined([denied, { id: "next", role: "user", parts: [{ type: "text", text: "Edit my gear now" }] }])).toBe(false);
    expect(signInDeclined([])).toBe(false);
  });
  it("pauses a guest's call to a tool that reads their account", () => {
    expect(signInApproval(false)({ toolCall: { toolName: "myFavorites" } })).toBe("user-approval");
    expect(signInApproval(false)({ toolCall: { toolName: "myGear" } })).toBe("user-approval");
    expect(signInApproval(false)({ toolCall: { toolName: "askToSignIn" } })).toBeUndefined();
  });

  it("lets a signed-in user's call run, and never gates a tool that needs no account", () => {
    expect(signInApproval(true)({ toolCall: { toolName: "myFavorites" } })).toBeUndefined();
    expect(signInApproval(false)({ toolCall: { toolName: "queryLenses" } })).toBeUndefined();
  });

  it("names the card's reason, and does not take inherited keys for tool names", () => {
    expect(signInGate("myGear")).toBe("gear");
    expect(signInGate("myFavorites")).toBe("favorites");
    expect(signInGate("toString")).toBeUndefined();
  });
});
