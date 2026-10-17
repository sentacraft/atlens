"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import ToggleChipGroup from "@/components/ui/toggle-chip-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import type { AskIrisResponseFeedbackInput } from "@/lib/askiris/response-feedback-contract";
import { postResponseFeedback } from "@/lib/askiris/response-feedback-client";
import { cn } from "@/lib/utils";

type Rating = AskIrisResponseFeedbackInput["rating"];

const REASONS = [
  "incorrect_information",
  "did_not_answer",
  "irrelevant_recommendation",
  "missing_information",
  "unclear_answer",
  "other",
] as const;

type ReasonCode = (typeof REASONS)[number];

const OPTION_CLS =
  "rounded-md px-1.5 py-1 text-zinc-400 transition-colors hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:text-zinc-500 dark:hover:text-zinc-200";

function logFeedbackFailure(responseMessageId: string, error: unknown): void {
  console.error("[askiris] response feedback request failed", {
    responseMessageId,
    errorType: error instanceof Error ? error.name : "unknown",
  });
}

/** A one-line rating under a response: a tap saves it, and details open in a dialog only on request. */
export default function ResponseFeedback({ responseMessageId }: { responseMessageId: string }) {
  const t = useTranslations("AskIris.responseFeedback");
  const [rating, setRating] = useState<Rating | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsSent, setDetailsSent] = useState(false);
  const [reasons, setReasons] = useState<ReasonCode[]>([]);
  const [comment, setComment] = useState("");
  const write = useMutation({
    mutationFn: postResponseFeedback,
    scope: { id: `askiris-response-feedback:${responseMessageId}` },
    retry: false,
    onError: (error) => logFeedbackFailure(responseMessageId, error),
  });

  if (dismissed) {
    return null;
  }

  function rate(next: Rating) {
    setRating(next);
    write.mutate({ responseMessageId, rating: next });
  }

  function sendDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating) {
      return;
    }
    write.mutate({ responseMessageId, rating, reasonCodes: reasons, comment });
    setDetailsOpen(false);
    setDetailsSent(true);
  }

  const canSendDetails = reasons.length > 0 || comment.trim().length > 0;

  return (
    <div className="flex flex-col gap-2 px-1 pt-1 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span role={rating === null ? undefined : "status"} className="text-zinc-600 dark:text-zinc-300">
          {rating === null ? t("prompt") : detailsSent ? t("detailsThanks") : t("thanks")}
        </span>
        {/* One group, so the × wraps together with the options instead of alone. */}
        <span className="flex items-center gap-1">
          {rating === null ? (
            <>
              <button type="button" onClick={() => rate("helpful")} className={OPTION_CLS}>
                {t("helpful")}
              </button>
              <button type="button" onClick={() => rate("unhelpful")} className={OPTION_CLS}>
                {t("unhelpful")}
              </button>
            </>
          ) : (
            !detailsSent &&
            !detailsOpen && (
              <button type="button" onClick={() => setDetailsOpen(true)} className={OPTION_CLS}>
                {t("tellMore")}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("dismiss")}
            className={cn(OPTION_CLS, "inline-flex items-center")}
          >
            <X className="size-4" />
          </button>
        </span>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogPopup className="max-w-md">
          <form onSubmit={sendDetails} className="flex min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle>{rating === "unhelpful" ? t("title") : t("tellMore")}</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pb-4">
              {rating === "unhelpful" && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="sr-only">{t("title")}</legend>
                  <ToggleChipGroup<ReasonCode>
                    options={REASONS.map((reason) => ({ key: reason, label: t(`reasons.${reason}`) }))}
                    selectedKeys={reasons}
                    onToggle={(reason) =>
                      setReasons((prev) => (prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]))
                    }
                  />
                </fieldset>
              )}
              <label className="sr-only" htmlFor={`askiris-feedback-comment-${responseMessageId}`}>
                {t("commentLabel")}
              </label>
              <Textarea
                id={`askiris-feedback-comment-${responseMessageId}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t("commentPlaceholder")}
                rows={4}
                maxLength={2000}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDetailsOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={!canSendDetails}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
