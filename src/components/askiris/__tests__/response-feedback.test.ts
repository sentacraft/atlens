import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { findTurnIdForResponse } from "../response-feedback";

function message(id: string, role: UIMessage["role"]): UIMessage {
  return { id, role, parts: [] } as UIMessage;
}

describe("findTurnIdForResponse", () => {
  it("associates an assistant response with the nearest preceding user message", () => {
    const messages = [
      message("user-1", "user"),
      message("assistant-1", "assistant"),
      message("user-2", "user"),
      message("assistant-2", "assistant"),
    ];

    expect(findTurnIdForResponse(messages, 1)).toBe("user-1");
    expect(findTurnIdForResponse(messages, 3)).toBe("user-2");
  });

  it("returns null when an assistant response has no preceding user message", () => {
    expect(findTurnIdForResponse([message("assistant-1", "assistant")], 0)).toBeNull();
  });
});
