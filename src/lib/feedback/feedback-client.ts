import { feedbackStatusSchema, type FeedbackStatus, type FeedbackSubmission } from "./feedback-contract";

async function feedbackResponse(res: Response) {
  const data: unknown = await res.json().catch(() => null);
  const status = feedbackStatusSchema.safeParse(data);
  if (!res.ok && (!status.success || !status.data.status)) {
    const error = data && typeof data === "object" && "error" in data ? String(data.error) : "request_failed";
    throw new Error(error);
  }
  return feedbackStatusSchema.parse(data);
}

export async function submitFeedback(payload: FeedbackSubmission): Promise<{ status: FeedbackStatus }> {
  const result = await feedbackResponse(await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  if (!result.status) {
    throw new Error("missing_submission_status");
  }
  return { status: result.status };
}

export async function getFeedbackStatus(submissionId: string): Promise<FeedbackStatus | null> {
  const response = await fetch(`/api/feedback?submissionId=${encodeURIComponent(submissionId)}`, { cache: "no-store" });
  return (await feedbackResponse(response)).status;
}
