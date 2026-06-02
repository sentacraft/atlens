"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FeedbackForm from "./FeedbackForm";
import type { FeedbackContext, FeedbackField, FeedbackType } from "@/lib/feedback";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FeedbackType;
  context?: FeedbackContext;
  /** Pre-built list of reportable fields for this lens. Only shown for data_issue type. */
  fields?: FeedbackField[];
}

// Desktop shell only — on mobile FeedbackTrigger navigates to /feedback (a
// document-flow page) so the submit button never hides behind the iOS keyboard.
// Desktop has no keyboard constraint, so it keeps the centered dialog. The form
// body itself is shared via FeedbackForm.
export default function FeedbackDialog({
  open,
  onOpenChange,
  type,
  context,
  fields,
}: FeedbackDialogProps) {
  const t = useTranslations("Feedback");
  const layerRef = useRef<HTMLDivElement | null>(null);
  const titleKey = type === "data_issue" ? "titleDataIssue" : "titleGeneral";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} responsive={false}>
      <DialogContent layerRef={layerRef} className="max-w-md p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        {/* Remount on open so the form state resets each time. */}
        {open && (
          <FeedbackForm
            type={type}
            context={context}
            fields={fields}
            layout="container"
            onDone={() => onOpenChange(false)}
            selectPortalContainer={layerRef}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
