"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import FeedbackSuccessState from "./FeedbackSuccessState";
import FeedbackReplyFields from "./FeedbackReplyFields";
import FeedbackStatusNotice from "./FeedbackStatusNotice";
import { ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import { Dialog, DialogCancel, DialogClose, DialogPopup, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FeedbackController } from "@/lib/feedback/use-feedback";

export default function FeedbackDialog({ open, onOpenChange, feedback, mode }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: FeedbackController;
  mode: "create" | "edit";
}) {
  const t = useTranslations("Feedback");
  const [edited, setEdited] = useState(feedback.draft);
  const textareaId = useId();
  useEffect(() => { if (open) {setEdited(feedback.draft);} }, [open, feedback.draft]);
  const fields = edited.fields;
  const groups = [...new Set(fields.map((field) => field.group ?? ""))];
  const selected = fields.find((field) => field.label === edited.context?.field);
  const context = edited.context;
  const success = feedback.status === "sent";
  const invalidContact = feedback.validation === "contactRequired" && edited.wantsReply && !feedback.contactFor(edited).trim();

  function setContext(patch: Partial<NonNullable<typeof context>>) {
    setEdited((current) => ({ ...current, context: { ...current.context, ...patch } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="flex max-w-md flex-col sm:max-h-[calc(var(--visible-height)-4rem)]">
        <DialogHeader className="shrink-0 flex-row items-start justify-between gap-3 pr-5">
          <DialogTitle className={success ? "sr-only" : undefined}>
            {t(mode === "edit" ? "editTitle" : edited.type === "data_issue" ? "titleDataIssue" : "titleGeneral")}
          </DialogTitle>
          <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "size-11 shrink-0")} aria-label={t("close")}><X className="size-4" /></DialogClose>
        </DialogHeader>
        {success ? <FeedbackSuccessState onClose={() => onOpenChange(false)} /> : (
          <form onSubmit={(event) => { event.preventDefault(); void feedback.submit(edited); }} className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-4 [&>*]:shrink-0">
            {context?.lensModel && (
              <div className="flex flex-col gap-1 border-b border-zinc-200 pb-3 text-sm">
                <span className="text-xs text-zinc-500">{t("affectedLensLabel")}</span>
                <span className="font-medium">{context.lensBrand} {context.lensModel}</span>
              </div>
            )}
            {fields.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-600">{t("fieldPickerLabel")}</span>
                <Select disabled={feedback.locked} value={context?.field ?? ""} onValueChange={(value) => {
                  const field = fields.find((entry) => entry.label === value);
                  setContext({ field: value ?? undefined, currentValue: field?.currentValue, suggestedCorrection: "" });
                }} items={[...fields.map((field) => ({ value: field.label, label: field.label })), { value: t("fieldOther"), label: t("fieldOther") }]}>
                  <SelectTrigger className="min-h-11 w-full"><SelectValue placeholder={t("fieldPickerPlaceholder")} /></SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => <SelectGroup key={group}>{group && <SelectLabel>{group}</SelectLabel>}{fields.filter((field) => (field.group ?? "") === group).map((field) => <SelectItem key={field.label} value={field.label}>{field.label}</SelectItem>)}</SelectGroup>)}
                    <SelectItem value={t("fieldOther")}>{t("fieldOther")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {edited.type === "data_issue" && context?.field && (
              <div className="flex flex-col gap-2 text-xs text-zinc-600">
                {context.currentValue && !selected?.hideCurrentValue && <p>{t("currentValueLabel")} <span className="font-medium text-zinc-900">{context.currentValue}</span></p>}
                <label className="flex flex-col gap-2">{t("suggestedCorrectionLabel")}
                  <Textarea rows={1} disabled={feedback.locked} value={context.suggestedCorrection ?? ""} onChange={(event) => setContext({ suggestedCorrection: event.target.value })} maxLength={200} placeholder={t("suggestedCorrectionPlaceholder")} />
                </label>
              </div>
            )}
            <label htmlFor={textareaId} className="text-xs text-zinc-600">{t(fields.length ? "descriptionLabel" : "descriptionLabelMain")}</label>
            <Textarea id={textareaId} value={edited.description} disabled={feedback.locked} onChange={(event) => setEdited((current) => ({ ...current, description: event.target.value }))} rows={4} maxLength={2000} placeholder={t(fields.length ? "descriptionPlaceholder" : "descriptionPlaceholderMain")} />
            <FeedbackReplyFields draft={edited} contact={feedback.contactFor(edited)} onChange={(patch) => setEdited((current) => ({ ...current, ...patch }))} disabled={feedback.locked} invalid={invalidContact} />
            <FeedbackStatusNotice feedback={feedback} />
          </form>
        )}
        {!success && <DialogFooter className="shrink-0">
          <DialogCancel render={<Button type="button" variant="ghost" className="min-h-11" />}>{t("cancel")}</DialogCancel>
          {mode === "edit" && <Button type="button" variant="outline" className="min-h-11" disabled={feedback.locked} onClick={() => { feedback.update(edited); onOpenChange(false); }}>{t("saveChanges")}</Button>}
          <Button type="button" className="min-h-11" disabled={feedback.locked || feedback.checking} onClick={() => void feedback.submit(edited)}>{t(feedback.status === "pending" ? "submitting" : "submit")}</Button>
        </DialogFooter>}
      </DialogPopup>
    </Dialog>
  );
}
