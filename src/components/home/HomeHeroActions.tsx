"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import AiTag from "@/components/iris/AiTag";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import ExampleQuestion from "@/components/askiris/ExampleQuestion";
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useBreakpoint } from "@/hooks/useViewport";
import { cn } from "@/lib/utils";
import { askIrisHandoffPath } from "@/lib/url/askiris";
import { ASK_IRIS_PATH, browsePath } from "@/lib/url/routes";

const PRIMARY_CLS = `inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium ${ACTION_PRIMARY_CLS}`;
const SECONDARY_CLS =
  "inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors";

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
  const examples = t.raw("irisExamples") as string[];

  useEffect(() => {
    if (!expanded) {
      return;
    }
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
      <div className="mt-3">
        <AskIrisComposer
          value={draft}
          onChange={setDraft}
          onSubmit={() => ask(draft)}
          placeholder={t("irisPlaceholder")}
          sendLabel={t("irisSend")}
          autoFocus
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <ExampleQuestion key={example} disabled={false} onClick={() => ask(example)}>
            {example}
          </ExampleQuestion>
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
