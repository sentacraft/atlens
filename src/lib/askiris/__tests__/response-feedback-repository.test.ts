import { describe, expect, it, vi } from "vitest";
import {
  deleteAskIrisResponseFeedback,
  saveAskIrisResponseFeedback,
  type AskIrisResponseFeedbackRecord,
} from "../response-feedback-repository";

function feedbackRecord(
  overrides: Partial<AskIrisResponseFeedbackRecord> = {},
): AskIrisResponseFeedbackRecord {
  return {
    feedbackId: "feedback-1",
    turnId: "user-message-1",
    responseMessageId: "assistant-message-1",
    rating: "unhelpful",
    reasonCodes: ["incorrect_recommendation", "missed_requirement"],
    comment: "The comparison used the wrong mount.",
    createdAt: 1_800_000_000_000,
    updatedAt: 1_800_000_000_000,
    ...overrides,
  };
}

describe("saveAskIrisResponseFeedback", () => {
  it("inserts feedback with multiple reasons for an assistant response", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;

    await saveAskIrisResponseFeedback(db, feedbackRecord());

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(response_message_id)"));
    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO askiris_response_feedback"),
    );
    expect(bind).toHaveBeenCalledWith(
      "feedback-1",
      "user-message-1",
      "assistant-message-1",
      "unhelpful",
      JSON.stringify(["incorrect_recommendation", "missed_requirement"]),
      "The comparison used the wrong mount.",
      1_800_000_000_000,
      1_800_000_000_000,
    );
    expect(run).toHaveBeenCalledOnce();
  });

  it("clears reasons and comments for a helpful rating", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;

    await saveAskIrisResponseFeedback(db, feedbackRecord({ rating: "helpful" }));

    expect(bind).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "helpful",
      null,
      null,
      expect.anything(),
      expect.anything(),
    );
  });
});

describe("deleteAskIrisResponseFeedback", () => {
  it("deletes the active feedback for an assistant response", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;

    await deleteAskIrisResponseFeedback(db, "assistant-message-1");

    expect(prepare).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM askiris_response_feedback"),
    );
    expect(bind).toHaveBeenCalledWith("assistant-message-1");
    expect(run).toHaveBeenCalledOnce();
  });
});
