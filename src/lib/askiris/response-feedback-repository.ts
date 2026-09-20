import "server-only";
import type { AskIrisResponseFeedbackInput } from "./response-feedback-contract";

export interface AskIrisResponseFeedbackRecord extends AskIrisResponseFeedbackInput {
  /** Unique identifier retained when an existing response rating is changed. */
  feedbackId: string;
  /** Unix timestamp in milliseconds when feedback was first submitted. */
  createdAt: number;
  /** Unix timestamp in milliseconds when feedback was last changed. */
  updatedAt: number;
}

export async function saveAskIrisResponseFeedback(
  db: D1Database,
  record: AskIrisResponseFeedbackRecord,
): Promise<void> {
  const reasonCodesJson =
    record.rating === "unhelpful" && record.reasonCodes?.length
      ? JSON.stringify(record.reasonCodes)
      : null;
  const comment = record.rating === "unhelpful" ? (record.comment ?? null) : null;

  await db
    .prepare(
      `INSERT INTO askiris_response_feedback (
        feedback_id,
        turn_id,
        response_message_id,
        rating,
        reason_codes_json,
        comment,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(response_message_id) DO UPDATE SET
        turn_id = excluded.turn_id,
        rating = excluded.rating,
        reason_codes_json = excluded.reason_codes_json,
        comment = excluded.comment,
        updated_at = excluded.updated_at`,
    )
    .bind(
      record.feedbackId,
      record.turnId,
      record.responseMessageId,
      record.rating,
      reasonCodesJson,
      comment,
      record.createdAt,
      record.updatedAt,
    )
    .run();
}

export async function deleteAskIrisResponseFeedback(
  db: D1Database,
  responseMessageId: string,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM askiris_response_feedback
       WHERE response_message_id = ?`,
    )
    .bind(responseMessageId)
    .run();
}
