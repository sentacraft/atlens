import { describe, expect, it } from "vitest";
import { hasRepeatedToolFailure } from "../repeated-tool-failure";

const failure = (toolName: string, input: unknown) => ({
  type: "tool-error",
  toolName,
  input,
  error: new Error("Unknown lens ref"),
});

describe("hasRepeatedToolFailure", () => {
  it("stops a tool call that already failed twice with the same input", () => {
    const input = { picks: [{ ref: "i8f3h", reason: "Sharp" }] };

    expect(
      hasRepeatedToolFailure([
        { content: [{ type: "text" }, failure("recommendLenses", input)] },
        { content: [failure("recommendLenses", structuredClone(input))] },
      ]),
    ).toBe(true);
  });

  it("lets the model retry once", () => {
    expect(
      hasRepeatedToolFailure([{ content: [failure("recommendLenses", { picks: [] })] }]),
    ).toBe(false);
  });

  it("lets the model retry with corrected input", () => {
    expect(
      hasRepeatedToolFailure([
        { content: [failure("recommendLenses", { picks: [{ ref: "bad" }] })] },
        { content: [failure("recommendLenses", { picks: [{ ref: "fixed" }] })] },
      ]),
    ).toBe(false);
  });

  it("does not count the same input failing on different tools", () => {
    expect(
      hasRepeatedToolFailure([
        { content: [failure("lensDetails", { refs: ["a"] })] },
        { content: [failure("listLenses", { refs: ["a"] })] },
      ]),
    ).toBe(false);
  });

  it("ignores successful calls", () => {
    const input = { query: "56mm" };

    expect(
      hasRepeatedToolFailure([
        { content: [{ type: "tool-result", toolName: "searchLensByName", input }] },
        { content: [{ type: "tool-result", toolName: "searchLensByName", input }] },
      ]),
    ).toBe(false);
  });
});
