"use client";

import { useId, useState, type RefObject } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Iris from "@/components/Iris";
import type { IrisConfig } from "@/config/iris-config";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { track } from "@/lib/analytics";
import type { FeedbackContext, FeedbackField, FeedbackType } from "@/lib/feedback";

type Status = "idle" | "submitting" | "success";

const IRIS_FEEDBACK: IrisConfig = {
  N: 7,
  pinDistance: 85,
  slotOffset: 0.804533,
  bladeLength: 120,
  bladeWidth: 40,
  openFStop: 1.4,
  defaultFStop: 4,
  size: 48,
  strokeWidth: 1,
  onMount: { type: "sweep", sweepMs: 600, totalMs: 1200 },
  chaseTauMs: 60,
};

export interface FeedbackFormProps {
  type: FeedbackType;
  context?: FeedbackContext;
  fields?: FeedbackField[];
  /**
   * "container": rendered inside the desktop dialog (Select popups portal into
   * the dialog layer). "page": rendered in the mobile document-flow page, where
   * the whole page scrolls so the submit button never hides behind the keyboard.
   */
  layout: "container" | "page";
  /** Called on cancel and on success-close — closes the dialog or navigates back. */
  onDone: () => void;
  /** Portal target for the field Select; the dialog passes its layer ref. */
  selectPortalContainer?: RefObject<HTMLDivElement | null>;
}

export default function FeedbackForm({
  type,
  context,
  fields,
  layout,
  onDone,
  selectPortalContainer,
}: FeedbackFormProps) {
  const t = useTranslations("Feedback");
  const [description, setDescription] = useState("");
  const [selectedFieldLabel, setSelectedFieldLabel] = useState("");
  const [suggestedCorrection, setSuggestedCorrection] = useState("");
  const [replyContact, setReplyContact] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const wantsReplyCheckboxId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const textareaId = useId();
  const correctionId = useId();
  const contactId = useId();

  const showFieldPicker = type === "data_issue" && fields && fields.length > 0;

  const otherField: FeedbackField = { label: t("fieldOther"), group: t("fieldGroupOther") };
  const allFields = showFieldPicker ? [...fields, otherField] : [];

  const selectedField = allFields.find((f) => f.label === selectedFieldLabel);

  // Group fields by their `group` property, preserving insertion order.
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

  const lensHeader =
    type === "data_issue" && context?.lensModel
      ? { brand: context.lensBrand ?? "", model: context.lensModel }
      : null;

  const hasContent =
    description.trim().length > 0 || suggestedCorrection.trim().length > 0;
  const canSubmit = status !== "submitting";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "submitting") {
      return;
    }
    if (!hasContent) {
      setSubmitAttempted(true);
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          description: description.trim(),
          ...(wantsReply && replyContact.trim() ? { replyContact: replyContact.trim() } : {}),
          context: {
            ...(context ?? {}),
            ...(selectedFieldLabel ? { field: selectedFieldLabel } : {}),
            ...(selectedField?.currentValue ? { currentValue: selectedField.currentValue } : {}),
            ...(suggestedCorrection.trim() ? { suggestedCorrection: suggestedCorrection.trim() } : {}),
          },
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "request_failed");
      }

      setStatus("success");
      track("feedback_submit", { feedback_type: type });
    } catch (err) {
      setStatus("idle");
      const detail = err instanceof Error ? err.message : "unknown";
      toast.error(`${t("error")} (${detail})`);
    }
  }

  return (
    <div className={cn("flex flex-col", layout === "page" && "mx-auto w-full max-w-xl")}>
      {status !== "success" && (
        <div className="px-5 pt-4">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {t("emailLabel")}{" "}
            <a
              href="mailto:me@atlens.app"
              className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              me@atlens.app
            </a>
          </p>
        </div>
      )}

      {status === "success" ? (
        <div className="flex flex-col items-center gap-3 px-5 py-6">
          <Iris config={IRIS_FEEDBACK} uid="feedback-iris" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {t("success")}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
              {t("successBody")}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pb-4 pt-3">
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
                <SelectContent portalContainer={selectPortalContainer}>
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
          <textarea
            id={textareaId}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(showFieldPicker ? "descriptionPlaceholder" : "descriptionPlaceholderMain")}
            rows={4}
            maxLength={2000}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base sm:text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
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
          {/* Submission errors are shown via toast, not inline */}
        </form>
      )}

      {/* Action row lives in the scroll stream (no sticky footer) so it never
          sits behind the iOS keyboard on the mobile page. */}
      <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800">
        {status === "success" ? (
          <Button type="button" variant="outline" onClick={onDone}>
            {t("close")}
          </Button>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onDone}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {status === "submitting" ? t("submitting") : t("submit")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
