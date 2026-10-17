import { describe, expect, it } from "vitest";
import { tool } from "ai";
import { z } from "zod";
import { hasRepeatedToolFailure, withRepeatedFailureNotice } from "../repeated-tool-failure";

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

describe("withRepeatedFailureNotice", () => {
  const options = { toolCallId: "call", messages: [] } as unknown as Parameters<
    NonNullable<ReturnType<typeof flaky>["execute"]>
  >[1];

  function flaky() {
    return tool({
      inputSchema: z.object({ ref: z.string() }),
      execute: ({ ref }) => {
        if (ref !== "good") {
          throw new Error(`Unknown lens ref "${ref}".`);
        }
        return { ok: true };
      },
    });
  }

  it("tells the model on the second identical failure that tools are now off", async () => {
    const { lookup } = withRepeatedFailureNotice({ lookup: flaky() });

    await expect(lookup.execute!({ ref: "bad" }, options)).rejects.toThrow(/^Unknown lens ref "bad"\.$/);
    await expect(lookup.execute!({ ref: "bad" }, options)).rejects.toThrow(
      /^Unknown lens ref "bad"\. This exact call has now failed twice/,
    );
  });

  it("does not add the notice when the input changes or the call succeeds", async () => {
    const { lookup } = withRepeatedFailureNotice({ lookup: flaky() });

    await expect(lookup.execute!({ ref: "bad" }, options)).rejects.toThrow(/^Unknown lens ref "bad"\.$/);
    await expect(lookup.execute!({ ref: "worse" }, options)).rejects.toThrow(/^Unknown lens ref "worse"\.$/);
    await expect(lookup.execute!({ ref: "good" }, options)).resolves.toEqual({ ok: true });
  });

  it("leaves a tool without execute as it is", () => {
    const clientSide = tool({ inputSchema: z.object({}) });

    expect(withRepeatedFailureNotice({ clientSide }).clientSide).toBe(clientSide);
  });
});
