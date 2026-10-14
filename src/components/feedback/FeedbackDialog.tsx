"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import FeedbackSuccessState from "@/components/feedback/FeedbackSuccessState";
import { ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import {
  Dialog,
  DialogClose,
  DialogPopup,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/analytics";
import { submitFeedback } from "@/lib/feedback/feedback-client";
import type {
  FeedbackContext,
  FeedbackSubmission,
  FeedbackSubmissionContext,
  FeedbackType,
} from "@/lib/feedback/feedback-contract";

export interface FeedbackField {
  label: string;
  currentValue?: string;
  group?: string;
  hideCurrentValue?: boolean;
}

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FeedbackType;
  context?: FeedbackContext;
  fields?: FeedbackField[];
}

function nonEmpty(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  type,
  context,
  fields,
}: FeedbackDialogProps) {
  const t = useTranslations("Feedback");
  const [description, setDescription] = useState("");
  const [selectedFieldLabel, setSelectedFieldLabel] = useState("");
  const [suggestedCorrection, setSuggestedCorrection] = useState("");
  const [replyContact, setReplyContact] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const wantsReplyCheckboxId = useId();
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dialogLayerRef = useRef<HTMLDivElement | null>(null);
  const textareaId = useId();
  const correctionId = useId();
  const contactId = useId();

  const {
    isPending,
    isSuccess,
    mutate,
    reset: resetMutation,
  } = useMutation({
    mutationFn: submitFeedback,
    onSuccess: (_, payload) => {
      track("feedback_submit", { feedback_type: payload.type });
    },
    onError: (error) => {
      console.error("[feedback] submission failed", {
        errorType: error instanceof Error ? error.name : "unknown",
      });
      toast.error(`${t("error")} (${error instanceof Error ? error.message : "unknown"})`);
    },
  });

  const showFieldPicker = type === "data_issue" && fields && fields.length > 0;

  const otherField: FeedbackField = { label: t("fieldOther"), group: t("fieldGroupOther") };
  const allFields = showFieldPicker ? [...fields, otherField] : [];

  const selectedField = allFields.find((f) => f.label === selectedFieldLabel);

  const groupedFields = showFieldPicker
    ? (() => {
        const groups: { label: string; fields: FeedbackField[] }[] = [];
        const index = new Map<string, number>();
        for (const f of allFields) {
          const key = f.group ?? "";
          if (!index.has(key)) {
            index.set(key, groups.length);
            groups.push({ label: key, fields: [f] });
          } else {
            groups[index.get(key)!].fields.push(f);
          }
        }
        return groups;
      })()
    : [];

  useEffect(() => {
    if (open) {
      setDescription("");
      setSelectedFieldLabel("");
      setSuggestedCorrection("");
      setReplyContact("");
      setWantsReply(false);
      resetMutation();
      setSubmitAttempted(false);
    }
  }, [open, resetMutation]);

  const titleKey = type === "data_issue" ? "titleDataIssue" : "titleGeneral";

  const lensHeader =
    type === "data_issue" && context?.lensModel
      ? { brand: context.lensBrand ?? "", model: context.lensModel }
      : null;

  function createSubmissionPayload(): FeedbackSubmission {
    const contextPayload: FeedbackSubmissionContext = {
      lensId: nonEmpty(context?.lensId),
      lensModel: nonEmpty(context?.lensModel),
      lensBrand: nonEmpty(context?.lensBrand),
      searchQuery: nonEmpty(context?.searchQuery),
      field: nonEmpty(selectedFieldLabel) ?? nonEmpty(context?.field),
      currentValue: nonEmpty(selectedField?.currentValue),
      suggestedCorrection: nonEmpty(suggestedCorrection),
    };
    const payload: FeedbackSubmission = {
      type,
      description: description.trim(),
    };
    const replyContactValue = nonEmpty(replyContact);

    if (wantsReply && replyContactValue) {
      payload.replyContact = replyContactValue;
    }
    if (Object.values(contextPayload).some((value) => value !== undefined)) {
      payload.context = contextPayload;
    }

    return payload;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    if (!hasContent) {
      setSubmitAttempted(true);
      return;
    }

    mutate(createSubmissionPayload());
  }

  const hasContent =
    description.trim().length > 0 || suggestedCorrection.trim().length > 0;
  const canSubmit = !isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h-none: the drawer grows upward so the footer stays put instead of being clipped. */}
      <DialogPopup className="max-w-md max-h-none">
        <DialogHeader className="flex-row items-start justify-between gap-3 pr-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className={isSuccess ? "sr-only" : undefined}>
              {t(titleKey)}
            </DialogTitle>
            {!isSuccess && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {t("emailLabel")}{" "}
                <a
                  href="mailto:me@atlens.app"
                  className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  me@atlens.app
                </a>
              </p>
            )}
          </div>
          <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "hidden h-9 w-9 shrink-0 sm:inline-flex")}>
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>

        {isSuccess ? (
          <FeedbackSuccessState onClose={() => onOpenChange(false)} />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pb-4">
            {lensHeader && (
              <div className="flex flex-col gap-0.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {t("affectedLensLabel")}
                </span>
                <div className="flex items-baseline gap-1.5">
                  {lensHeader.brand && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {lensHeader.brand}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {lensHeader.model}
                  </span>
                </div>
              </div>
            )}

            {showFieldPicker && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {t("fieldPickerLabel")}
                </span>
                <Select
                  value={selectedFieldLabel}
                  onValueChange={(v) => {
                    setSelectedFieldLabel(v ?? "");
                    setSuggestedCorrection("");
                  }}
                  items={allFields.map((f) => ({ value: f.label, label: f.label }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fieldPickerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent portalContainer={dialogLayerRef}>
                    {groupedFields.map((group) => (
                      <SelectGroup key={group.label}>
                        {group.label && <SelectLabel>{group.label}</SelectLabel>}
                        {group.fields.map((f) => (
                          <SelectItem key={f.label} value={f.label}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                <div className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  selectedField && selectedField !== otherField ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}>
                  <div className="overflow-hidden min-h-0">
                    <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 mt-1.5">
                      {selectedField?.currentValue && !selectedField.hideCurrentValue && (
                        <div className="flex items-baseline gap-2">
                          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                            {t("currentValueLabel")}
                          </span>
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {selectedField.currentValue}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor={correctionId}
                          className="text-xs text-zinc-400 dark:text-zinc-500"
                        >
                          {t("suggestedCorrectionLabel")}
                        </label>
                        <input
                          id={correctionId}
                          type="text"
                          value={suggestedCorrection}
                          onChange={(e) => setSuggestedCorrection(e.target.value)}
                          placeholder={t("suggestedCorrectionPlaceholder")}
                          maxLength={200}
                          className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showFieldPicker && (
              <label
                htmlFor={textareaId}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                {t("descriptionLabel")}
                <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">
                  ({t("descriptionOptional")})
                </span>
              </label>
            )}
            <Textarea
              id={textareaId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(showFieldPicker ? "descriptionPlaceholder" : "descriptionPlaceholderMain")}
              rows={4}
              maxLength={2000}
            />
            <div className="flex flex-col gap-2">
              <label
                htmlFor={wantsReplyCheckboxId}
                className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none"
              >
                <Checkbox
                  id={wantsReplyCheckboxId}
                  checked={wantsReply}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setWantsReply(next);
                    if (!next) {
                      setReplyContact("");
                    }
                  }}
                />
                {t("replyContactToggle")}
              </label>
              <input
                id={contactId}
                type="text"
                value={replyContact}
                onChange={(e) => setReplyContact(e.target.value)}
                placeholder={t("replyContactPlaceholder")}
                aria-label={t("replyContactLabel")}
                disabled={!wantsReply}
                className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 disabled:placeholder:text-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-600 dark:disabled:placeholder:text-zinc-700"
              />
            </div>

            {showFieldPicker && submitAttempted && !hasContent && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t("contentRequired")}
              </p>
            )}
          </form>
        )}

        {!isSuccess ? (
          <DialogFooter>
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {isPending ? t("submitting") : t("submit")}
              </Button>
            </>
          </DialogFooter>
        ) : null}
        {/* Portal anchor inside the dialog, so picking a field does not dismiss the dialog. */}
        <div ref={dialogLayerRef} />
      </DialogPopup>
    </Dialog>
  );
}
