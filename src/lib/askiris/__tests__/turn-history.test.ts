import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { resolveTurn, storableResponse } from "../turn-history";

function text(id: string, role: "user" | "assistant", body = id): UIMessage {
  return { id, role, parts: [{ type: "text", text: body }] };
}

const stored = [text("u1", "user"), text("a1", "assistant"), text("u2", "user"), text("a2", "assistant")];

describe("resolveTurn", () => {
  it("appends a new user message to the stored history", () => {
    const incoming = text("u3", "user");

    expect(resolveTurn(stored, incoming, "a2")).toEqual({
      kind: "new",
      history: [...stored, incoming],
      userMessage: incoming,
      historyChanged: false,
    });
  });

  it("treats an already stored user message as a regenerate, using the stored copy", () => {
    const resent = text("u2", "user", "edited on the client");

    expect(resolveTurn(stored, resent, "a1")).toEqual({
      kind: "regenerate",
      history: stored.slice(0, 3),
      userMessage: stored[2],
      historyChanged: false,
    });
  });

  it("flags a client that did not see the stored history", () => {
    expect(resolveTurn(stored, text("u3", "user"), "a1")).toMatchObject({ historyChanged: true });
    expect(resolveTurn(stored, text("u3", "user"), null)).toMatchObject({ historyChanged: true });
    expect(resolveTurn([], text("u1", "user"), null)).toMatchObject({ historyChanged: false });
  });

  it("rejects a message that is not a user message", () => {
    expect(resolveTurn(stored, text("a9", "assistant"), "a2")).toEqual({ kind: "invalid" });
    expect(resolveTurn(stored, { ...text("a1", "user") }, "u1")).toEqual({ kind: "invalid" });
  });
});

describe("storableResponse", () => {
  it("drops tool calls that never got a result", () => {
    const message = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "text", text: "Looking", state: "done" },
        { type: "tool-queryLenses", toolCallId: "c1", state: "output-available", input: {}, output: {} },
        { type: "tool-queryLenses", toolCallId: "c2", state: "input-available", input: {} },
        { type: "tool-lensDetails", toolCallId: "c3", state: "output-error", input: {}, errorText: "x" },
      ],
    } as UIMessage;

    expect(storableResponse(message)?.parts.map((part) => part.type)).toEqual([
      "step-start",
      "text",
      "tool-queryLenses",
      "tool-lensDetails",
    ]);
  });

  it("returns nothing when only step markers remain", () => {
    const message = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "step-start" },
        { type: "tool-queryLenses", toolCallId: "c1", state: "input-streaming", input: {} },
      ],
    } as UIMessage;

    expect(storableResponse(message)).toBeUndefined();
  });
});
