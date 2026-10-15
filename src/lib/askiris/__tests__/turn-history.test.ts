import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { resolveTurn } from "../turn-history";

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

describe("resolveTurn with a client tool's output", () => {
  const asking: UIMessage = {
    id: "a3",
    role: "assistant",
    parts: [
      { type: "text", text: "stored prose" },
      { type: "tool-askForGear", toolCallId: "call-1", state: "input-available", input: { lenses: ["18-55"] } },
    ],
  };
  const history = [...stored, text("u3", "user"), asking];

  function answered(output: unknown, extra: Partial<UIMessage> = {}): UIMessage {
    return {
      ...asking,
      parts: [
        { type: "text", text: "rewritten on the client" },
        { type: "tool-askForGear", toolCallId: "call-1", state: "output-available", input: {}, output },
      ],
      ...extra,
    } as UIMessage;
  }

  it("fills in the pending call's output on the stored response and keeps everything else stored", () => {
    const turn = resolveTurn(history, answered({ outcome: "skipped" }), "u3", ["askForGear"]);

    expect(turn).toEqual({
      kind: "tool-result",
      history: [
        ...history.slice(0, -1),
        {
          ...asking,
          parts: [
            { type: "text", text: "stored prose" },
            {
              type: "tool-askForGear",
              toolCallId: "call-1",
              state: "output-available",
              input: { lenses: ["18-55"] },
              output: { outcome: "skipped" },
            },
          ],
        },
      ],
      userMessage: history.at(-2),
      historyChanged: false,
    });
  });

  it("rejects an output for a tool the client may not answer", () => {
    expect(resolveTurn(history, answered({ outcome: "skipped" }), "u3", []).kind).toBe("invalid");
  });

  it("rejects an assistant message that is not the stored last response", () => {
    expect(resolveTurn(history, answered({ outcome: "saved" }, { id: "a2" }), "u3", ["askForGear"]).kind).toBe("invalid");
  });
});
