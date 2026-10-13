export type FeedbackType = "data_issue" | "general";

export interface FeedbackContext {
  lensId?: string;
  lensModel?: string;
  lensBrand?: string;
  searchQuery?: string;
  field?: string;
}

export interface FeedbackSubmissionContext extends FeedbackContext {
  currentValue?: string;
  suggestedCorrection?: string;
}

export interface FeedbackSubmission {
  type: FeedbackType;
  description: string;
  replyContact?: string;
  context?: FeedbackSubmissionContext;
}

export async function submitFeedback(payload: FeedbackSubmission): Promise<void> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(data?.error ?? "request_failed");
  }
}
