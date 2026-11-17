"use client";

import { useState, type ReactNode } from "react";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import { createFeedbackDraft, type FeedbackField } from "@/lib/feedback/feedback-draft";
import { useFeedback } from "@/lib/feedback/use-feedback";
import type { FeedbackContext, FeedbackType } from "@/lib/feedback/feedback-contract";
import { track } from "@/lib/analytics/analytics";
import { FEEDBACK_LINK_CLS } from "@/config/ui-tokens";

interface FeedbackTriggerProps {
  type: FeedbackType;
  context?: FeedbackContext;
  fields?: FeedbackField[];
  className?: string;
  children: ReactNode;
  stopPropagation?: boolean;
}

export default function FeedbackTrigger({
  type,
  context,
  fields,
  className = FEEDBACK_LINK_CLS,
  children,
  stopPropagation = false,
}: FeedbackTriggerProps) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(() => createFeedbackDraft({ type, context, fields }));
  const feedback = useFeedback(seed, open);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
          track("feedback_open", { feedback_type: type });
          setSeed(createFeedbackDraft({ type, context, fields }));
          setOpen(true);
        }}
        onPointerDown={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
        }}
        className={className}
      >
        {children}
      </button>
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        feedback={feedback}
        mode="create"
      />
    </>
  );
}
