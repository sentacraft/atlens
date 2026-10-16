"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import AiTag from "@/components/iris/AiTag";
import { ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useBreakpoint } from "@/hooks/useViewport";
import { cn } from "@/lib/utils";
import { askIrisHandoffPath } from "@/lib/url/askiris";
import { ASK_IRIS_PATH, browsePath } from "@/lib/url/routes";

const PRIMARY_CLS =
  "inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 font-medium text-sm hover:opacity-90 transition-opacity";
const SECONDARY_CLS =
  "inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors";
const EXAMPLE_CLS =
  "rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-left text-[13px] text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800";

/** The home hero's actions: browsing first, and Ask Iris that opens in place on wider screens. */
export default function HomeHeroActions() {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");
  const mount = useEffectiveMount();
  const router = useRouter();
  const wide = useBreakpoint("sm");
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const examples = t.raw("irisExamples") as string[];

  useEffect(() => {
    if (!expanded) {
      return;
    }
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [expanded]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed) {
      router.push(askIrisHandoffPath(trimmed));
    }
  }

  const irisLabel = (
    <>
      {tNav("askIris")}
      <AiTag />
    </>
  );

  if (!expanded) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={browsePath(mount)} className={PRIMARY_CLS}>
          {t("cta")} →
        </Link>
        {wide ? (
          <button type="button" aria-expanded={false} onClick={() => setExpanded(true)} className={SECONDARY_CLS}>
            {irisLabel}
          </button>
        ) : (
          <Link href={ASK_IRIS_PATH} className={SECONDARY_CLS}>
            {irisLabel}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="w-full max-w-[760px] rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-50">{irisLabel}</span>
          <span className="text-[13px] text-zinc-500 dark:text-zinc-400">{t("irisIntro")}</span>
        </p>
        <button type="button" onClick={() => setExpanded(false)} aria-label={t("irisClose")} className={cn(ICON_CLOSE_BTN_CLS, "h-7 w-7")}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <form
        className="mt-3 flex items-center gap-2 rounded-2xl border border-zinc-300 py-1.5 pr-1.5 pl-4 focus-within:border-zinc-400 dark:border-zinc-600"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("irisPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-sm dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t("irisSend")}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button key={example} type="button" onClick={() => ask(example)} className={EXAMPLE_CLS}>
            {example}
          </button>
        ))}
      </div>
      <Link
        href={browsePath(mount)}
        className="mt-3 inline-block text-[13px] text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {t("orBrowse")} →
      </Link>
    </div>
  );
}
