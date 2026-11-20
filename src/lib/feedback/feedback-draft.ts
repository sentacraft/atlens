import { MAX_FEEDBACK_SEARCH_QUERY_LENGTH, type FeedbackSubmission, type FeedbackSubmissionContext, type FeedbackType } from "./feedback-contract";

export interface FeedbackField {
  label: string;
  currentValue?: string;
  group?: string;
  description?: string;
  imageOptions?: { label: string; value: string }[];
}

export interface FeedbackDraft {
  id: string;
  type: FeedbackType;
  description: string;
  context?: FeedbackSubmissionContext;
  fields: FeedbackField[];
  wantsReply: boolean;
  replyContact: string | null;
}

export type FeedbackSeed = Pick<FeedbackDraft, "type"> & Partial<Omit<FeedbackDraft, "type">>;

export function createFeedbackDraft(seed: FeedbackSeed): FeedbackDraft {
  const context = seed.context?.searchQuery
    ? { ...seed.context, searchQuery: seed.context.searchQuery.slice(0, MAX_FEEDBACK_SEARCH_QUERY_LENGTH) }
    : seed.context;
  return { id: seed.id ?? crypto.randomUUID(), type: seed.type, description: seed.description ?? "", fields: seed.fields ?? [], wantsReply: seed.wantsReply ?? false, replyContact: seed.replyContact ?? null, context };
}

export function feedbackContact(draft: FeedbackDraft, accountEmail: string | null): string {
  return draft.replyContact ?? accountEmail ?? "";
}

export function feedbackPayload(draft: FeedbackDraft, accountEmail: string | null): FeedbackSubmission {
  const replyContact = feedbackContact(draft, accountEmail).trim();
  return {
    submissionId: draft.id,
    type: draft.type,
    description: draft.description.trim(),
    ...(draft.context ? { context: draft.context } : {}),
    ...(draft.wantsReply && replyContact ? { replyContact } : {}),
  };
}
