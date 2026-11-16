"use client";

import { useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CHAT_CARD_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import type { FeedbackDraft } from "@/lib/feedback/feedback-draft";
import { useFeedback } from "@/lib/feedback/use-feedback";
import FeedbackDialog from "./FeedbackDialog";
import FeedbackReplyFields from "./FeedbackReplyFields";
import FeedbackStatusNotice from "./FeedbackStatusNotice";

export default function FeedbackCard({ draft }: { draft: FeedbackDraft }) {
  const t = useTranslations("Feedback");
  const feedback = useFeedback(draft, true);
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState(false);
  const current = feedback.draft;
  if (feedback.status === "sent") {
    return <div className="flex w-full max-w-[560px] flex-col gap-2 px-1">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1.5"><Check className="size-3.5" />{t("submitted")}</span>
        {feedback.submittedDraft && <Button type="button" variant="ghost" size="sm" className="min-h-11 text-xs" onClick={() => setDetails(!details)}>{t(details ? "hideContent" : "viewContent")}</Button>}
      </div>
      {details && feedback.submittedDraft && <p className="text-sm whitespace-pre-wrap">{feedback.submittedDraft.description}</p>}
    </div>;
  }
  if (collapsed) {
    return <div className="flex w-full max-w-[560px] items-center justify-between gap-3 px-1 text-xs text-zinc-500">
      <span>{t("draftCollapsed")}</span><Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setCollapsed(false)}>{t("expandDraft")}</Button>
    </div>;
  }
  return <>
    <section className={CHAT_CARD_CLS} aria-label={t("draftLabel")}>
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold"><MessageSquare className="size-4 text-zinc-500" />{t(current.type === "data_issue" ? "dataIssue" : "general")}</h3>
        <button type="button" className={cn(ICON_CLOSE_BTN_CLS, "-mr-2 size-11")} disabled={feedback.locked} aria-label={t("collapseDraft")} onClick={() => setCollapsed(true)}><X className="size-4" /></button>
      </div>
      <div className="flex flex-col gap-4 p-3 sm:p-4">
        {current.context?.lensModel && <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
          <div className="flex min-w-0 flex-col gap-1"><span className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">{current.context.lensBrand}</span><span className="text-sm font-medium break-words">{current.context.lensModel}</span></div>
          {current.context.field && <div className="flex shrink-0 flex-col gap-1 border-l border-zinc-200 pl-4"><span className="text-xs text-zinc-500">{t("fieldPickerLabel")}</span><span className="text-sm font-medium">{current.context.field}</span></div>}
        </div>}
        <p className="text-sm leading-6 break-words whitespace-pre-wrap">{current.description}</p>
        {current.context?.searchQuery && <p className="text-xs text-zinc-600">{t("missingLens")} {current.context.searchQuery}</p>}
        {current.context?.suggestedCorrection && <p className="text-sm">{t("suggestedCorrectionLabel")} {current.context.suggestedCorrection}</p>}
        <FeedbackReplyFields draft={current} contact={feedback.contact} onChange={feedback.update} disabled={feedback.locked} invalid={feedback.validation === "contactRequired"} />
        <FeedbackStatusNotice feedback={feedback} />
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-3 py-3 sm:px-4">
        <Button type="button" variant="ghost" className="min-h-11" disabled={feedback.locked} onClick={() => setEditing(true)}>{t("edit")}</Button>
        <Button type="button" className="min-h-11" disabled={feedback.locked || feedback.checking} onClick={() => void feedback.submit(current)}>{t(feedback.status === "pending" ? "submitting" : feedback.failed ? "retry" : "send")}</Button>
      </div>
    </section>
    <FeedbackDialog open={editing} onOpenChange={setEditing} feedback={feedback} mode="edit" />
  </>;
}
