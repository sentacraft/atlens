import "server-only";

export const ASKIRIS_FEEDBACK_SCHEMA_VERSION = 1;

export type AskIrisFeedbackRating = "helpful" | "unhelpful";

export interface AskIrisFeedbackRecord {
  /** Unique identifier retained when an existing response rating is changed. */
  feedbackId: string;
  /** Stable identifier for the user turn being evaluated. */
  turnId: string;
  /** Assistant UIMessage identifier for the exact response being evaluated. */
  responseMessageId: string;
  /** Binary user assessment of the response. */
  rating: AskIrisFeedbackRating;
  /** Optional stable code explaining the rating. */
  reasonCode?: string;
  /** Unix timestamp in milliseconds when feedback was first submitted. */
  createdAt: number;
  /** Unix timestamp in milliseconds when feedback was last changed. */
  updatedAt: number;
}

export async function saveAskIrisFeedback(
  db: D1Database,
  record: AskIrisFeedbackRecord,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO askiris_feedback (
        feedback_id,
        turn_id,
        response_message_id,
        rating,
        reason_code,
        created_at,
        updated_at,
        schema_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(response_message_id) DO UPDATE SET
        turn_id = excluded.turn_id,
        rating = excluded.rating,
        reason_code = excluded.reason_code,
        updated_at = excluded.updated_at,
        schema_version = excluded.schema_version`,
    )
    .bind(
      record.feedbackId,
      record.turnId,
      record.responseMessageId,
      record.rating,
      record.reasonCode ?? null,
      record.createdAt,
      record.updatedAt,
      ASKIRIS_FEEDBACK_SCHEMA_VERSION,
    )
    .run();
}
