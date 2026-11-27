import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { choiceRequestInputSchema, choicesCardUsed } from "@/lib/ai/choice-request";

function choiceReply(state: "input-available" | "output-available", outcome?: "answered" | "skipped"): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [
      {
        type: "tool-askChoices",
        toolCallId: "c1",
        input: { questions: [{ question: "What do you shoot?", options: ["Travel", "Portraits"] }] },
        state,
        ...(outcome ? { output: { outcome } } : {}),
      },
    ],
  } as unknown as UIMessage;
}

describe("choiceRequestInputSchema", () => {
  it("accepts English option phrases up to 80 characters and rejects longer ones", () => {
    const valid = choiceRequestInputSchema.safeParse({
      questions: [
        {
          question: "What are your macro subjects mostly?",
          options: ["Static: product, food, flowers, documents", "Live subjects: insects, plants outdoors"],
        },
      ],
    });
    expect(valid.success).toBe(true);

    const tooLong = choiceRequestInputSchema.safeParse({
      questions: [
        {
          question: "Which option fits?",
          options: ["A".repeat(81), "Short"],
        },
      ],
    });
    expect(tooLong.success).toBe(false);
  });
});

describe("choicesCardUsed", () => {
  it("is false on a fresh user turn and after a prior turn's choices", () => {
    const user1 = { id: "u1", role: "user", parts: [{ type: "text", text: "Recommend a lens" }] } as UIMessage;
    const user2 = { id: "u2", role: "user", parts: [{ type: "text", text: "What about portraits?" }] } as UIMessage;

    expect(choicesCardUsed([])).toBe(false);
    expect(choicesCardUsed([user1])).toBe(false);
    expect(choicesCardUsed([user1, choiceReply("output-available", "answered"), user2])).toBe(false);
  });

  it("is true once askChoices has been used in the current user turn", () => {
    const user1 = { id: "u1", role: "user", parts: [{ type: "text", text: "Zoom lenses" }] } as UIMessage;

    expect(choicesCardUsed([user1, choiceReply("output-available", "answered")])).toBe(true);
    expect(choicesCardUsed([user1, choiceReply("output-available", "skipped")])).toBe(true);
    expect(choicesCardUsed([user1, choiceReply("input-available")])).toBe(true);
  });
});
