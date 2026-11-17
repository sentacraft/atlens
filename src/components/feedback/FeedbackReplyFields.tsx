"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import type { FeedbackDraft } from "@/lib/feedback/feedback-draft";

export default function FeedbackReplyFields({ draft, contact, onChange, disabled, invalid }: {
  draft: FeedbackDraft;
  contact: string;
  onChange: (patch: Partial<FeedbackDraft>) => void;
  disabled: boolean;
  invalid: boolean;
}) {
  const t = useTranslations("Feedback");
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-zinc-600">
        <Checkbox id={id} checked={draft.wantsReply} disabled={disabled} onCheckedChange={(checked) => onChange({ wantsReply: checked === true })} />
        {t("replyContactToggle")}
      </label>
      {draft.wantsReply && (
        <label className="flex flex-col gap-2 text-xs text-zinc-600">
          {t("replyContactLabel")}
          <input type="text" value={contact} disabled={disabled} maxLength={300} aria-invalid={invalid || undefined}
            onChange={(event) => onChange({ replyContact: event.target.value })} placeholder={t("replyContactPlaceholder")}
            className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-zinc-400 sm:text-sm" />
        </label>
      )}
      {invalid && <p role="alert" className="text-xs text-red-600">{t("contactRequired")}</p>}
    </div>
  );
}
