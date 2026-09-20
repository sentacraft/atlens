"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ThumbsDown, ThumbsUp, X } from "lucide-react";
import FeedbackSuccessState from "@/components/feedback/FeedbackSuccessState";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import type { AskIrisResponseFeedbackInput } from "@/lib/askiris/response-feedback-contract";
import { cn } from "@/lib/utils";

type Rating = AskIrisResponseFeedbackInput["rating"];
type FeedbackStatus = "idle" | "submitting" | "success";

const REASONS = [
  "incorrect_information",
  "did_not_answer",
  "irrelevant_recommendation",
  "missing_information",
  "unclear_answer",
  "other",
] as const;

type ReasonCode = (typeof REASONS)[number];
type ResponseFeedbackWrite = Omit<
  AskIrisResponseFeedbackInput,
  "reasonCodes" | "comment"
> & {
  reasonCodes?: ReasonCode[];
  comment?: string;
};

interface ResponseFeedbackDetails {
  reasonCodes: ReasonCode[];
  comment: string;
}

interface ResponseFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responseMessageId: string;
  savedDetails: ResponseFeedbackDetails;
  onSubmit: (details: ResponseFeedbackDetails) => Promise<void>;
}

async function postResponseFeedback({
  turnId,
  responseMessageId,
  rating,
  reasonCodes,
  comment,
}: ResponseFeedbackWrite): Promise<void> {
  const res = await fetch("/api/askiris/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      turnId,
      responseMessageId,
      rating,
      ...(reasonCodes?.length ? { reasonCodes } : {}),
      ...(comment?.trim() ? { comment: comment.trim() } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`feedback_${res.status}`);
  }
}

function logFeedbackFailure(responseMessageId: string, error: unknown): void {
  console.error("[askiris] response feedback request failed", {
    responseMessageId,
    errorType: error instanceof Error ? error.name : "unknown",
  });
}

function ResponseFeedbackDialog({
  open,
  onOpenChange,
  responseMessageId,
  savedDetails,
  onSubmit,
}: ResponseFeedbackDialogProps) {
  const t = useTranslations("AskIris.responseFeedback");
  const [status, setStatus] = useState<FeedbackStatus>("idle");
  const [selectedReasons, setSelectedReasons] = useState<ReasonCode[]>([]);
  const [comment, setComment] = useState("");
  const savedDetailsRef = useRef(savedDetails);

  useEffect(() => {
    savedDetailsRef.current = savedDetails;
  }, [savedDetails]);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      return;
    }

    setStatus("idle");
    setSelectedReasons(savedDetailsRef.current.reasonCodes);
    setComment(savedDetailsRef.current.comment);
  }, [open]);

  function toggleReason(reason: ReasonCode, checked: boolean) {
    setSelectedReasons((previous) => {
      if (checked) {
        return previous.includes(reason) ? previous : [...previous, reason];
      }
      return previous.filter((value) => value !== reason);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") {
      return;
    }

    const details = {
      reasonCodes: selectedReasons,
      comment: comment.trim(),
    };
    setStatus("submitting");

    try {
      await onSubmit(details);
    } finally {
      // The response feedback is already visible optimistically. Whether the
      // optional detail update succeeds is intentionally not shown to the user.
      setStatus("success");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md max-h-none">
        <DialogHeader className="flex-row items-start justify-between gap-3 pr-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className={status === "success" ? "sr-only" : undefined}>
              {t("title")}
            </DialogTitle>
            {status !== "success" ? (
              <DialogDescription>{t("description")}</DialogDescription>
            ) : null}
          </div>
          <DialogClose
            className={cn(
              ICON_CLOSE_BTN_CLS,
              FROSTED_OVERLAY_CHROME_CLS,
              "hidden h-9 w-9 shrink-0 sm:inline-flex",
            )}
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>

        {status === "success" ? (
          <FeedbackSuccessState
            uid={`askiris-feedback-${responseMessageId}`}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-5 pb-4">
            <div className="flex flex-col gap-2">
              {REASONS.map((reason) => {
                const id = `askiris-feedback-${responseMessageId}-${reason}`;
                return (
                  <label
                    key={reason}
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <Checkbox
                      id={id}
                      checked={selectedReasons.includes(reason)}
                      onCheckedChange={(checked) => toggleReason(reason, checked === true)}
                    />
                    {t(`reasons.${reason}`)}
                  </label>
                );
              })}
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`askiris-feedback-comment-${responseMessageId}`}
                className="sr-only"
              >
                {t("commentLabel")}
              </label>
              <textarea
                id={`askiris-feedback-comment-${responseMessageId}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t("commentPlaceholder")}
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600 sm:text-sm"
              />
              <span className="self-end text-xs text-zinc-400 dark:text-zinc-500">
                {comment.length} / 2000
              </span>
            </div>
            <DialogFooter className="border-t-0 px-0 pb-0 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {t("skip")}
              </Button>
              <Button
                type="submit"
                disabled={status === "submitting" || selectedReasons.length === 0}
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}

export default function ResponseFeedback({
  turnId,
  responseMessageId,
}: {
  turnId: string;
  responseMessageId: string;
}) {
  const t = useTranslations("AskIris.responseFeedback");
  const [rating, setRating] = useState<Rating | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [savedDetails, setSavedDetails] = useState<ResponseFeedbackDetails>({
    reasonCodes: [],
    comment: "",
  });

  function enqueueFeedbackWrite(payload: ResponseFeedbackWrite): Promise<void> {
    const request = writeQueueRef.current
      .catch(() => undefined)
      .then(() => postResponseFeedback(payload));
    writeQueueRef.current = request.catch(() => undefined);
    return request;
  }

  function submitRating(nextRating: Rating): void {
    if (rating === nextRating) {
      if (nextRating === "unhelpful") {
        setDialogOpen(true);
      }
      return;
    }

    setRating(nextRating);
    if (nextRating === "helpful") {
      setSavedDetails({ reasonCodes: [], comment: "" });
    } else {
      setSavedDetails({ reasonCodes: [], comment: "" });
      setDialogOpen(true);
    }

    void enqueueFeedbackWrite({
      turnId,
      responseMessageId,
      rating: nextRating,
    }).catch((error) => logFeedbackFailure(responseMessageId, error));
  }

  async function submitDetails(details: ResponseFeedbackDetails): Promise<void> {
    setSavedDetails(details);
    try {
      await enqueueFeedbackWrite({
        turnId,
        responseMessageId,
        rating: "unhelpful",
        reasonCodes: details.reasonCodes,
        comment: details.comment,
      });
    } catch (error) {
      logFeedbackFailure(responseMessageId, error);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1 px-1 pt-1">
        <button
          type="button"
          aria-label={t("helpful")}
          aria-pressed={rating === "helpful"}
          title={t("helpful")}
          onClick={() => submitRating("helpful")}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-zinc-400/50 active:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:active:bg-zinc-800 sm:size-8",
            rating === "helpful" &&
              "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50",
          )}
        >
          <ThumbsUp className="size-[18px]" fill={rating === "helpful" ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          aria-label={t("unhelpful")}
          aria-pressed={rating === "unhelpful"}
          title={t("unhelpful")}
          onClick={() => submitRating("unhelpful")}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-zinc-400/50 active:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:active:bg-zinc-800 sm:size-8",
            rating === "unhelpful" &&
              "bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50",
          )}
        >
          <ThumbsDown className="size-[18px]" fill={rating === "unhelpful" ? "currentColor" : "none"} />
        </button>
      </div>
      <ResponseFeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        responseMessageId={responseMessageId}
        savedDetails={savedDetails}
        onSubmit={submitDetails}
      />
    </>
  );
}
