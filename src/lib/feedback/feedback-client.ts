import type { FeedbackSubmission } from "@/lib/feedback/feedback-contract";

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
