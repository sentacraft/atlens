import type { AskIrisResponseFeedbackInput } from "@/lib/askiris/response-feedback-contract";

export async function postResponseFeedback({
  responseMessageId,
  rating,
  reasonCodes,
  comment,
}: AskIrisResponseFeedbackInput): Promise<void> {
  const body: AskIrisResponseFeedbackInput = {
    responseMessageId,
    rating,
  };

  if (reasonCodes?.length) {
    body.reasonCodes = reasonCodes;
  }
  const trimmedComment = comment?.trim();
  if (trimmedComment) {
    body.comment = trimmedComment;
  }

  const res = await fetch("/api/askiris/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`feedback_${res.status}`);
  }
}

export async function deleteResponseFeedback(responseMessageId: string): Promise<void> {
  const res = await fetch(
    `/api/askiris/feedback/${encodeURIComponent(responseMessageId)}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    throw new Error(`feedback_${res.status}`);
  }
}
