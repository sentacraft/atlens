"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { track } from "@/lib/analytics/analytics";
import { feedbackContact, feedbackPayload, type FeedbackDraft } from "./feedback-draft";
import { getFeedbackStatus, submitFeedback } from "./feedback-client";

export function useFeedback(seed: FeedbackDraft, active: boolean) {
  const client = useQueryClient();
  const { data: session } = authClient.useSession();
  const accountEmail = session?.user && !session.user.isAnonymous ? session.user.email : null;
  const draftKey = ["feedback-draft", seed.id];
  const statusKey = ["feedback-status", seed.id];
  const { data: draft } = useQuery({ queryKey: draftKey, queryFn: async () => seed, initialData: seed, enabled: false, gcTime: 30 * 60_000 });
  const receipt = useQuery({ queryKey: statusKey, queryFn: () => getFeedbackStatus(seed.id), enabled: active, retry: false, refetchOnWindowFocus: false });
  const [validation, setValidation] = useState<"contentRequired" | "contactRequired" | null>(null);
  const [submittedDraft, setSubmittedDraft] = useState<FeedbackDraft | null>(null);
  const inFlight = useRef(false);
  const mutation = useMutation({
    mutationFn: submitFeedback,
    retry: false,
    onSuccess: async ({ status }, payload) => {
      await client.cancelQueries({ queryKey: statusKey });
      client.setQueryData(statusKey, status);
      if (status === "sent") {
        track("feedback_submit", { feedback_type: payload.type });
      }
    },
    onError: () => client.invalidateQueries({ queryKey: statusKey }),
  });
  const { reset } = mutation;
  useEffect(() => { setValidation(null); setSubmittedDraft(null); reset(); }, [seed.id, reset]);
  const status = mutation.isPending ? "pending" : receipt.data ?? "draft";
  const locked = status === "pending" || status === "uncertain" || status === "sent";
  const contact = feedbackContact(draft, accountEmail);

  function update(patch: Partial<FeedbackDraft>) {
    if (locked) {return;}
    setValidation(null);
    mutation.reset();
    client.setQueryData<FeedbackDraft>(draftKey, (current) => ({ ...(current ?? draft), ...patch, id: seed.id }));
  }

  async function submit(next: FeedbackDraft) {
    if (locked || inFlight.current || receipt.isLoading) {return;}
    update(next);
    if (!next.description.trim() && !next.context?.suggestedCorrection?.trim()) {
      setValidation("contentRequired");
      return;
    }
    if (next.wantsReply && !feedbackContact(next, accountEmail).trim()) {
      setValidation("contactRequired");
      return;
    }
    setValidation(null);
    setSubmittedDraft({ ...next, replyContact: feedbackContact(next, accountEmail) });
    inFlight.current = true;
    try {
      await mutation.mutateAsync(feedbackPayload({ ...next, id: seed.id }, accountEmail));
    } catch {
      // The receipt read recovers a response lost after the server accepted the submission.
    } finally {
      inFlight.current = false;
    }
  }

  return {
    draft, update, submit, contact, status, locked, submittedDraft,
    contactFor: (value: FeedbackDraft) => feedbackContact(value, accountEmail),
    checking: receipt.isLoading,
    validation,
    failed: mutation.isError || status === "failed",
    checkStatus: () => { void receipt.refetch(); },
  };
}

export type FeedbackController = ReturnType<typeof useFeedback>;
