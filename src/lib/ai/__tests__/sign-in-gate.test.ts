import { describe, expect, it } from "vitest";
import { signInApproval, signInGate } from "../sign-in-gate";

describe("the sign-in gate", () => {
  it("pauses a guest's call to a tool that reads their account", () => {
    expect(signInApproval(false)({ toolCall: { toolName: "myFavorites" } })).toBe("user-approval");
    expect(signInApproval(false)({ toolCall: { toolName: "myGear" } })).toBe("user-approval");
  });

  it("lets a signed-in user's call run, and never gates a tool that needs no account", () => {
    expect(signInApproval(true)({ toolCall: { toolName: "myFavorites" } })).toBeUndefined();
    expect(signInApproval(false)({ toolCall: { toolName: "queryLenses" } })).toBeUndefined();
  });

  it("names the card's reason, and does not take inherited keys for tool names", () => {
    expect(signInGate("myFavorites")).toBe("favorite");
    expect(signInGate("toString")).toBeUndefined();
  });
});
