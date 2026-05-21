"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Iris from "@/components/Iris";
import type { IrisConfig } from "@/config/iris-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { track } from "@/lib/analytics";

export type FeedbackType = "data_issue" | "general";

export interface FeedbackField {
  /** The label exactly as shown on the page, used both as display text and issue payload. */
  label: string;
  /** Current display value for this field on this lens, shown read-only after selection. */
  currentValue?: string;
  /** Group label for the dropdown. Fields with the same group are rendered together. */
  group?: string;
  /** When true, the current value is not shown to the user (e.g. internal image paths). */
  hideCurrentValue?: boolean;
}

export interface FeedbackContext {
  lensId?: string;
  lensModel?: string;
  lensBrand?: string;
  searchQuery?: string;
  field?: string;
}

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FeedbackType;
  context?: FeedbackContext;
  /** Pre-built list of reportable fields for this lens. Only shown for data_issue type. */
  fields?: FeedbackField[];
}

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
  const [replyEmail, setReplyEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const dialogLayerRef = useRef<HTMLDivElement | null>(null);
  const textareaId = useId();
  const correctionId = useId();
  const emailId = useId();

  const showFieldPicker = type === "data_issue" && fields && fields.length > 0;

  const selectedField = fields?.find((f) => f.label === selectedFieldLabel);

  // Group fields by their `group` property, preserving insertion order.
  const groupedFields = showFieldPicker
    ? (() => {
        const groups: { label: string; fields: FeedbackField[] }[] = [];
        const index = new Map<string, number>();
        for (const f of fields) {
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
      setReplyEmail("");
      setStatus("idle");
      setSubmitAttempted(false);
    }
  }, [open]);

  const titleKey = type === "data_issue" ? "titleDataIssue" : "titleGeneral";
  const descriptionKey = type === "data_issue" ? "descriptionDataIssue" : "descriptionGeneral";

  const lensHeader =
    type === "data_issue" && context?.lensModel
      ? { brand: context.lensBrand ?? "", model: context.lensModel }
      : null;

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
          ...(replyEmail.trim() ? { replyEmail: replyEmail.trim() } : {}),
          context: {
            ...(context ?? {}),
            ...(selectedFieldLabel ? { field: selectedFieldLabel } : {}),
            ...(selectedField?.currentValue ? { currentValue: selectedField.currentValue } : {}),
            ...(suggestedCorrection.trim() ? { suggestedCorrection: suggestedCorrection.trim() } : {}),
          },
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
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

  const hasContent =
    description.trim().length > 0 || suggestedCorrection.trim().length > 0;
  const canSubmit = status !== "submitting";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layerRef={dialogLayerRef}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          {status !== "success" && (
            <>
              <DialogDescription>{t(descriptionKey)}</DialogDescription>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {t("emailLabel")}{" "}
                <a
                  href="mailto:xglass@sentacraft.com"
                  className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  xglass@sentacraft.com
                </a>
              </p>
            </>
          )}
        </DialogHeader>


        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 px-5 py-6">
            <Iris config={IRIS_FEEDBACK} uid="feedback-iris" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {t("success")}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center leading-relaxed">
              {t("successBody")}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pb-2">
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
                  items={fields.map((f) => ({ value: f.label, label: f.label }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fieldPickerPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent
                    portalContainer={dialogLayerRef}
                    className="max-w-[min(20rem,calc(100vw-2rem))]"
                  >
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

                {selectedField && (
                  <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
                    {selectedField.currentValue && !selectedField.hideCurrentValue && (
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
                        className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <label
              htmlFor={textareaId}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              {t(showFieldPicker ? "descriptionLabel" : "descriptionLabelMain")}
              {showFieldPicker && (
                <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">
                  ({t("descriptionOptional")})
                </span>
              )}
            </label>
            <textarea
              id={textareaId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={emailId}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                {t("replyEmailLabel")}
                <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">
                  ({t("descriptionOptional")})
                </span>
              </label>
              <input
                id={emailId}
                type="email"
                value={replyEmail}
                onChange={(e) => setReplyEmail(e.target.value)}
                placeholder={t("replyEmailPlaceholder")}
                className="w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
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

        <DialogFooter>
          {status === "success" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("close")}
            </Button>
          ) : (
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
                {status === "submitting" ? t("submitting") : t("submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
