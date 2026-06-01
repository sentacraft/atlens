"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { mountToUrlSegment } from "@/lib/mount";
import { useCompareLensSearch } from "@/hooks/useCompareLensSearch";
import type { Lens } from "@/lib/types";
import LensSearchPanel from "./LensSearchPanel";

export default function LensSearchPageClient({ lenses }: { lenses: Lens[] }) {
  const t = useTranslations("Search");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompareIntent = searchParams.get("intent") === "compare";

  // Always called (hooks rule); only its callbacks are used for the compare
  // intent. CompareProvider is mounted in the locale layout, so this is safe
  // on every page under /[locale].
  const compare = useCompareLensSearch();

  function handleBack() {
    router.back();
  }

  function handleSelect(lens: Lens) {
    if (isCompareIntent) {
      compare.onSelectLens(lens);
      router.back();
      return;
    }
    router.push(`/lenses/${mountToUrlSegment(lens.mount)}/${lens.id}`);
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col bg-white dark:bg-zinc-950">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-zinc-100 bg-white/95 px-3 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t("back")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t("title")}
        </h1>
      </header>

      <LensSearchPanel
        lenses={lenses}
        onSelectLens={handleSelect}
        getResultState={isCompareIntent ? compare.getResultState : undefined}
        autoFocus
        layout="page"
      />
    </div>
  );
}
