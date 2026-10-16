"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useOpenIris } from "@/context/IrisPanelProvider";
import AiTag from "@/components/iris/AiTag";
import AskIrisComposer from "@/components/askiris/AskIrisComposer";
import ExampleQuestion from "@/components/askiris/ExampleQuestion";
import { useHomeIrisFocus } from "@/components/home/HomeIrisStage";
import { ACTION_PRIMARY_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { useBreakpoint } from "@/hooks/useViewport";
import { cn } from "@/lib/utils";
import { ASK_IRIS_PATH, browsePath } from "@/lib/url/routes";

const PRIMARY_CLS = `inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium ${ACTION_PRIMARY_CLS}`;
const SECONDARY_CLS =
  "inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors";

const MORPH_ID = "home-ask-iris";

/** The home hero's actions: browsing first, and Ask Iris that grows out of its button on wider screens. */
export default function HomeHeroActions() {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");
  const mount = useEffectiveMount();
  const openIris = useOpenIris();
  const wide = useBreakpoint("sm");
  const { focused: expanded, setFocused: setExpanded } = useHomeIrisFocus();
  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const examples = t.raw("irisExamples") as string[];

  const close = useCallback(() => {
    setExpanded(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [setExpanded]);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [expanded, close]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (trimmed) {
      setExpanded(false);
      openIris({ question: trimmed });
    }
  }

  const irisLabel = (
    <>
      {tNav("askIris")}
      <AiTag />
    </>
  );

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3">
      <AnimatePresence initial={false} mode="popLayout">
        {!expanded && (
          <motion.div
            key="browse"
            layout
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
          >
            <Link href={browsePath(mount)} className={PRIMARY_CLS}>
              {t("cta")} →
            </Link>
          </motion.div>
        )}
        {!wide ? (
          <Link key="link" href={ASK_IRIS_PATH} className={SECONDARY_CLS}>
            {irisLabel}
          </Link>
        ) : expanded ? (
          <motion.div
            key="panel"
            ref={panelRef}
            layoutId={MORPH_ID}
            style={{ borderRadius: 16 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            role="dialog"
            aria-label={tNav("askIris")}
            className="w-full max-w-[760px] overflow-hidden border border-zinc-200 bg-white p-4 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <motion.div
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.14, duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-50">{irisLabel}</span>
                  <span className="text-[13px] text-zinc-500 dark:text-zinc-400">{t("irisIntro")}</span>
                </p>
                <button type="button" onClick={close} aria-label={t("irisClose")} className={cn(ICON_CLOSE_BTN_CLS, "h-7 w-7")}>
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
                {examples.map((example, index) => (
                  <motion.div
                    key={example}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.2 + index * 0.035, duration: 0.3, ease: [0.22, 1, 0.36, 1] } }}
                  >
                    <ExampleQuestion disabled={false} onClick={() => ask(example)}>
                      {example}
                    </ExampleQuestion>
                  </motion.div>
                ))}
              </div>
              <Link
                href={browsePath(mount)}
                className="mt-3 inline-block text-[13px] text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {t("orBrowse")} →
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          <motion.button
            key="trigger"
            ref={triggerRef}
            type="button"
            layoutId={MORPH_ID}
            style={{ borderRadius: 12 }}
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            className={SECONDARY_CLS}
          >
            <motion.span layout="position" className="inline-flex items-center gap-1.5">
              {irisLabel}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
