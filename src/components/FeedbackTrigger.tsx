"use client";

import { useState, type ReactNode } from "react";
import FeedbackDialog, {
  type FeedbackContext,
  type FeedbackField,
  type FeedbackType,
} from "./FeedbackDialog";

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
  className,
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
