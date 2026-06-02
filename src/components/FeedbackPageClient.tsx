"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useNav } from "@/context/NavContext";
import FeedbackForm from "./FeedbackForm";
import type { FeedbackContext, FeedbackField, FeedbackType } from "@/lib/feedback";

export default function FeedbackPageClient({
  type,
  context,
  fields,
}: {
  type: FeedbackType;
  context?: FeedbackContext;
  fields?: FeedbackField[];
}) {
  const t = useTranslations("Feedback");
  const router = useRouter();
  const { navHidden } = useNav();
  const titleKey = type === "data_issue" ? "titleDataIssue" : "titleGeneral";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-white dark:bg-zinc-950">
      <header
        className="sticky z-20 flex items-center gap-2 border-b border-zinc-100 bg-white/95 px-3 py-3 backdrop-blur transition-[top] duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ top: navHidden ? 0 : "var(--nav-height)" }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label={t("back")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t(titleKey)}
        </h1>
      </header>

      <FeedbackForm
        type={type}
        context={context}
        fields={fields}
        layout="page"
        onDone={() => router.back()}
      />
    </div>
  );
}
