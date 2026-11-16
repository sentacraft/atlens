import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSqliteD1 } from "@/lib/__tests__/support/sqlite-d1";
import {
  claimFeedbackSubmission,
  getFeedbackSubmission,
  hashFeedbackPayload,
  releaseFeedbackSubmission,
  updateFeedbackSubmissionStatus,
} from "../feedback-repository";
import type { FeedbackSubmission } from "../feedback-contract";

let database: ReturnType<typeof createSqliteD1>;
const submissionId = "bfb9aef4-6c77-4900-81a6-fbf873ff8c01";
const payload: FeedbackSubmission = { submissionId, type: "general", description: "A useful app", replyContact: "user@example.com" };

beforeEach(() => {
  database = createSqliteD1("migrations/app");
});
afterEach(() => database.sqlite.close());

describe("feedback submissions", () => {
  it("hashes normalized payload fields, excluding the submission ID", async () => {
    const hash = await hashFeedbackPayload(payload);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashFeedbackPayload({ ...payload, submissionId: crypto.randomUUID() })).toBe(hash);
    expect(await hashFeedbackPayload({ ...payload, description: "Edited" })).not.toBe(hash);
    expect(await hashFeedbackPayload({ ...payload, replyContact: "other@example.com" })).not.toBe(hash);
    expect(await hashFeedbackPayload({ ...payload, context: { lensModel: "XF35", field: "weight" } })).toBe(
      await hashFeedbackPayload({ ...payload, context: { field: "weight", lensModel: "XF35" } }),
    );
  });

  it("atomically admits just one concurrent creator", async () => {
    const claims = await Promise.all(Array.from({ length: 8 }, () => claimFeedbackSubmission(database.d1, submissionId, "hash")));
    expect(claims.filter((claim) => claim.claimed)).toHaveLength(1);
    expect(claims.filter((claim) => claim.created)).toHaveLength(1);
    expect(await getFeedbackSubmission(database.d1, submissionId)).toMatchObject({ payloadHash: "hash", status: "pending" });
  });

  it("does not replace pending, sent or uncertain submissions with another payload", async () => {
    for (const status of ["pending", "sent", "uncertain"] as const) {
      const id = crypto.randomUUID();
      await claimFeedbackSubmission(database.d1, id, "original");
      if (status !== "pending") {
        await updateFeedbackSubmissionStatus(database.d1, id, "original", status, status === "sent" ? 42 : null);
      }
      const claim = await claimFeedbackSubmission(database.d1, id, "edited");
      expect(claim.claimed).toBe(false);
      expect(claim.record).toMatchObject({ status, payloadHash: "original" });
    }
  });

  it("allows a known failed submission to be edited and atomically reclaimed", async () => {
    await claimFeedbackSubmission(database.d1, submissionId, "old");
    await updateFeedbackSubmissionStatus(database.d1, submissionId, "old", "failed");
    const claims = await Promise.all(Array.from({ length: 4 }, () => claimFeedbackSubmission(database.d1, submissionId, "edited")));
    expect(claims.filter((claim) => claim.claimed)).toHaveLength(1);
    expect(claims.every((claim) => !claim.created)).toBe(true);
    expect(await getFeedbackSubmission(database.d1, submissionId)).toMatchObject({ payloadHash: "edited", status: "pending" });
  });

  it("stores only identifiers, hashes, status, issue number and timestamps", async () => {
    const hash = await hashFeedbackPayload(payload);
    await claimFeedbackSubmission(database.d1, submissionId, hash);
    await updateFeedbackSubmissionStatus(database.d1, submissionId, hash, "sent", 42);
    const row = database.sqlite.prepare("SELECT * FROM feedback_submissions").get();
    expect(Object.keys(row!).sort()).toEqual(["submission_id", "payload_hash", "status", "issue_number", "created_at", "updated_at"].sort());
    expect(JSON.stringify(row)).not.toContain(payload.description);
    expect(JSON.stringify(row)).not.toContain(payload.replyContact);
    expect(await getFeedbackSubmission(database.d1, submissionId)).toMatchObject({ status: "sent", issueNumber: 42 });
  });

  it("releases a denied first claim without altering a completed submission", async () => {
    await claimFeedbackSubmission(database.d1, submissionId, "hash");
    await releaseFeedbackSubmission(database.d1, submissionId, "wrong");
    expect(await getFeedbackSubmission(database.d1, submissionId)).not.toBeNull();
    await releaseFeedbackSubmission(database.d1, submissionId, "hash");
    expect(await getFeedbackSubmission(database.d1, submissionId)).toBeNull();
    await claimFeedbackSubmission(database.d1, submissionId, "hash");
    await updateFeedbackSubmissionStatus(database.d1, submissionId, "hash", "sent", 1);
    await releaseFeedbackSubmission(database.d1, submissionId, "hash");
    expect(await getFeedbackSubmission(database.d1, submissionId)).toMatchObject({ status: "sent" });
  });
});
