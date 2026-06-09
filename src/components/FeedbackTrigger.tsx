"use client";

import { useState, type ReactNode } from "react";
import FeedbackDialog, {
  type FeedbackContext,
  type FeedbackField,
  type FeedbackType,
} from "./FeedbackDialog";
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
  // Defaults to the shared inline feedback-link look; callers that need a
  // different shape (the page-chrome report button, the compare-table cell)
  // pass their own className to override.
  className = FEEDBACK_LINK_CLS,
  children,
  stopPropagation = false,
}: FeedbackTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
          track("feedback_open", { feedback_type: type });
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
        type={type}
        context={context}
        fields={fields}
      />
    </>
  );
}
