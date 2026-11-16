import "server-only";
import type { FeedbackStatus, FeedbackSubmission } from "./feedback-contract";

export interface FeedbackSubmissionRecord {
  submissionId: string;
  payloadHash: string;
  status: FeedbackStatus;
  issueNumber: number | null;
  createdAt: number;
  updatedAt: number;
}

export async function hashFeedbackPayload(payload: FeedbackSubmission): Promise<string> {
  const context = payload.context;
  const canonical = JSON.stringify([
    payload.type,
    payload.description,
    payload.replyContact ?? null,
    context?.lensId ?? null,
    context?.lensModel ?? null,
    context?.lensBrand ?? null,
    context?.searchQuery ?? null,
    context?.field ?? null,
    context?.currentValue ?? null,
    context?.suggestedCorrection ?? null,
  ]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getFeedbackSubmission(
  db: D1Database,
  submissionId: string,
): Promise<FeedbackSubmissionRecord | null> {
  return db.prepare(`SELECT submission_id AS submissionId, payload_hash AS payloadHash,
    status, issue_number AS issueNumber, created_at AS createdAt, updated_at AS updatedAt
    FROM feedback_submissions WHERE submission_id = ?`)
    .bind(submissionId)
    .first<FeedbackSubmissionRecord>();
}

export async function claimFeedbackSubmission(
  db: D1Database,
  submissionId: string,
  payloadHash: string,
): Promise<{ claimed: boolean; created: boolean; record: FeedbackSubmissionRecord }> {
  const now = Date.now();
  const inserted = await db.prepare(`INSERT INTO feedback_submissions
    (submission_id, payload_hash, status, issue_number, created_at, updated_at)
    VALUES (?, ?, 'pending', NULL, ?, ?) ON CONFLICT(submission_id) DO NOTHING`)
    .bind(submissionId, payloadHash, now, now)
    .run();
  if (inserted.meta.changes > 0) {
    return {
      claimed: true,
      created: true,
      record: { submissionId, payloadHash, status: "pending", issueNumber: null, createdAt: now, updatedAt: now },
    };
  }

  const retried = await db.prepare(`UPDATE feedback_submissions
    SET payload_hash = ?, status = 'pending', issue_number = NULL, updated_at = ?
    WHERE submission_id = ? AND status = 'failed'
    RETURNING submission_id AS submissionId, payload_hash AS payloadHash,
      status, issue_number AS issueNumber, created_at AS createdAt, updated_at AS updatedAt`)
    .bind(payloadHash, now, submissionId)
    .first<FeedbackSubmissionRecord>();
  if (retried) {
    return { claimed: true, created: false, record: retried };
  }
  const record = await getFeedbackSubmission(db, submissionId);
  if (!record) {
    throw new Error("Feedback claim disappeared");
  }
  return { claimed: false, created: false, record };
}

export async function updateFeedbackSubmissionStatus(
  db: D1Database,
  submissionId: string,
  payloadHash: string,
  status: Exclude<FeedbackStatus, "pending">,
  issueNumber: number | null = null,
): Promise<void> {
  const result = await db.prepare(`UPDATE feedback_submissions
    SET status = ?, issue_number = ?, updated_at = ?
    WHERE submission_id = ? AND payload_hash = ? AND status = 'pending'`)
    .bind(status, issueNumber, Date.now(), submissionId, payloadHash)
    .run();
  if (result.meta.changes !== 1) {
    throw new Error("Feedback completion lost its claim");
  }
}

export async function releaseFeedbackSubmission(
  db: D1Database,
  submissionId: string,
  payloadHash: string,
): Promise<void> {
  await db.prepare(`DELETE FROM feedback_submissions
    WHERE submission_id = ? AND payload_hash = ? AND status = 'pending'`)
    .bind(submissionId, payloadHash)
    .run();
}
