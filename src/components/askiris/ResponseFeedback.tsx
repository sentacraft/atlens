"use client";

import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import ToggleChipGroup from "@/components/ui/toggle-chip-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogCancel, DialogFooter, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import type { AskIrisResponseFeedbackInput } from "@/lib/askiris/response-feedback-contract";
import { postResponseFeedback } from "@/lib/askiris/response-feedback-client";
import { CHIP_BASE_CLS, CHIP_IDLE_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/analytics";
import { browserPromptStore, claimPrompt } from "@/lib/support-prompts";
import { useSupportDialog } from "@/context/SupportDialogProvider";

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

const OPTION_CLS = cn(CHIP_BASE_CLS, CHIP_IDLE_CLS, "gap-1 px-2.5 py-1");

function logFeedbackFailure(responseMessageId: string, error: unknown): void {
  console.error("[askiris] response feedback request failed", {
    responseMessageId,
    errorType: error instanceof Error ? error.name : "unknown",
  });
}

/** A one-line rating under a response, set off by a rule: a tap saves it, and details open in a dialog only on request. */
export default function ResponseFeedback({ responseMessageId }: { responseMessageId: string }) {
  const t = useTranslations("AskIris.responseFeedback");
  const promptId = useId();
  const openSupport = useSupportDialog();
  const [rating, setRating] = useState<Rating | null>(null);
  const [offerSupport, setOfferSupport] = useState(false);
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

  function rate(next: Rating) {
    setRating(next);
    write.mutate({ responseMessageId, rating: next });
    if (next === "helpful" && claimPrompt(browserPromptStore(), "iris_helpful")) {
      setOfferSupport(true);
      track("support_prompt", { prompt: "iris_helpful", action: "shown" });
    }
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
    <div className="mx-1 mt-1 flex flex-col gap-1.5 self-stretch border-t border-zinc-100 pt-2.5 text-xs">
      <div className="flex min-h-8 items-center justify-between gap-2">
      {rating === null ? (
        <>
          <span id={promptId} className="text-zinc-500">
            {t("prompt")}
          </span>
          <span role="group" aria-labelledby={promptId} className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => rate("helpful")} className={OPTION_CLS}>
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              {t("helpful")}
            </button>
            <button type="button" onClick={() => rate("unhelpful")} className={OPTION_CLS}>
              <ThumbsDown className="size-3.5" aria-hidden="true" />
              {t("unhelpful")}
            </button>
          </span>
        </>
      ) : (
        <>
          <span role="status" className="text-zinc-500">
            {detailsSent ? t("detailsThanks") : t("thanks")}
          </span>
          {!detailsSent && !detailsOpen && (
            <button type="button" onClick={() => setDetailsOpen(true)} className={cn(TEXT_LINK_CLS, "shrink-0 underline-offset-2")}>
              {t("tellMore")}
            </button>
          )}
        </>
      )}
      </div>
      {offerSupport && (
        <p className="leading-relaxed text-zinc-500">
          {t.rich("supportLine", {
            support: (chunks) => (
              <button
                type="button"
                onClick={() => {
                  track("support_prompt", { prompt: "iris_helpful", action: "opened" });
                  openSupport("iris_helpful");
                }}
                className={cn(TEXT_LINK_CLS, "underline-offset-2")}
              >
                {chunks}
              </button>
            ),
          })}
        </p>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogPopup className="max-w-md">
          <form onSubmit={sendDetails} className="flex min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle>{t("dialogTitle")}</DialogTitle>
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
                placeholder={rating === "unhelpful" ? t("commentPlaceholder") : t("commentPlaceholderHelpful")}
                rows={5}
                maxLength={2000}
              />
              <p className="text-[13px] leading-relaxed text-zinc-500">{t("notice")}</p>
            </div>
            <DialogFooter className="border-t-0 pt-0">
              <DialogCancel render={<Button type="button" variant="outline" size="lg" />}>{t("cancel")}</DialogCancel>
              <Button type="submit" size="lg" disabled={!canSendDetails}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
