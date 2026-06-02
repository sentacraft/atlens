"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";
import FeedbackDialog from "./FeedbackDialog";
import type { FeedbackContext, FeedbackField, FeedbackType } from "@/lib/feedback";
import { track } from "@/lib/analytics";
import { FEEDBACK_LINK_CLS } from "@/lib/ui-tokens";

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
  const router = useRouter();
  const isDesktop = useBreakpoint("sm");
  const mount = useEffectiveMount();

  // On mobile, navigate to the document-flow /feedback page (the submit button
  // would otherwise sit behind the iOS keyboard in a fixed overlay). The page
  // rebuilds the reportable-field list server-side from lensId, so nothing rich
  // needs to cross the navigation. Desktop opens the centered dialog.
  function buildFeedbackHref() {
    const params = new URLSearchParams({ type });
    if (context?.lensId) {
      params.set("mount", mountToUrlSegment(mount));
      params.set("lensId", context.lensId);
    }
    if (context?.searchQuery) {
      params.set("q", context.searchQuery);
    }
    return `/feedback?${params.toString()}`;
  }

  function handleClick(e: React.MouseEvent) {
    if (stopPropagation) {
      e.stopPropagation();
    }
    track("feedback_open", { feedback_type: type });
    if (isDesktop) {
      setOpen(true);
    } else {
      router.push(buildFeedbackHref());
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={(e) => {
          if (stopPropagation) {
            e.stopPropagation();
          }
        }}
        className={className}
      >
        {children}
      </button>
      {/* Desktop only — mobile navigates to /feedback instead. */}
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
