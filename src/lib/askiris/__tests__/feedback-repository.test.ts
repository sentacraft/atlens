import { describe, expect, it, vi } from "vitest";
import {
  ASKIRIS_FEEDBACK_SCHEMA_VERSION,
  saveAskIrisFeedback,
  type AskIrisFeedbackRecord,
} from "../feedback-repository";

function feedbackRecord(
  overrides: Partial<AskIrisFeedbackRecord> = {},
): AskIrisFeedbackRecord {
  return {
    feedbackId: "feedback-1",
    turnId: "user-message-1",
    responseMessageId: "assistant-message-1",
    rating: "unhelpful",
    reasonCode: "incorrect_recommendation",
    createdAt: 1_800_000_000_000,
    updatedAt: 1_800_000_000_000,
    ...overrides,
  };
}

describe("saveAskIrisFeedback", () => {
  it("inserts feedback for an assistant response", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;

    await saveAskIrisFeedback(db, feedbackRecord());

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(response_message_id)"));
    expect(bind).toHaveBeenCalledWith(
      "feedback-1",
      "user-message-1",
      "assistant-message-1",
      "unhelpful",
      "incorrect_recommendation",
      1_800_000_000_000,
      1_800_000_000_000,
      ASKIRIS_FEEDBACK_SCHEMA_VERSION,
    );
    expect(run).toHaveBeenCalledOnce();
  });

  it("stores no reason when one is not supplied", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });
    const db = { prepare } as unknown as D1Database;

    await saveAskIrisFeedback(db, feedbackRecord({ rating: "helpful", reasonCode: undefined }));

    expect(bind).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "helpful",
      null,
      expect.anything(),
      expect.anything(),
      ASKIRIS_FEEDBACK_SCHEMA_VERSION,
    );
  });
});
