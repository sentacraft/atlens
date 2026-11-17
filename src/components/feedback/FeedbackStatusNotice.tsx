"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { FeedbackController } from "@/lib/feedback/use-feedback";

export default function FeedbackStatusNotice({ feedback }: { feedback: FeedbackController }) {
  const t = useTranslations("Feedback");
  if (feedback.status === "pending" || feedback.status === "uncertain") {
    return (
      <div role="status" className="flex flex-col items-start gap-2 text-xs text-zinc-600">
        <p>{t(feedback.status === "pending" ? "pendingConfirmation" : "uncertain")}</p>
        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={feedback.checkStatus}>{t("checkStatus")}</Button>
      </div>
    );
  }
  if (feedback.failed) {return <p role="alert" className="text-xs text-red-600">{t("errorPreserved")}</p>;}
  if (feedback.validation === "contentRequired") {return <p role="alert" className="text-xs text-red-600">{t("contentRequired")}</p>;}
  return null;
}
