"use client";

import {
  type KeyboardEvent,
  type Ref,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens-search";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";
import { lensSubtitleLine } from "@/lib/lens.format";
import { useSearchTelemetry } from "./LensSearchDialog.telemetry";
import FeedbackTrigger from "./FeedbackTrigger";

export interface LensSearchResultState {
  actionLabel?: string;
  disabled?: boolean;
}

interface LensSearchPanelProps {
  lenses: Lens[];
  onSelectLens: (lens: Lens) => void;
  getResultState?: (lens: Lens) => LensSearchResultState | undefined;
  /** Focus + select the input on mount. */
  autoFocus?: boolean;
  /**
   * "container": results scroll inside a fixed-height region (desktop dialog).
   * "page": results grow naturally and the document body scrolls (mobile search
   * page) — this is what keeps the list reachable above the iOS keyboard without
   * any position:fixed / visualViewport gymnastics.
   */
  layout: "container" | "page";
  inputRef?: Ref<HTMLInputElement>;
}

export default function LensSearchPanel({
  lenses,
  onSelectLens,
  getResultState,
  autoFocus = false,
  layout,
  inputRef: externalInputRef,
}: LensSearchPanelProps) {
  const t = useTranslations("Search");
  const tBrand = useTranslations("Brands");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const localInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const resultsId = useId();
  const deferredQuery = useDeferredValue(query);

  function setInputRef(node: HTMLInputElement | null) {
    localInputRef.current = node;
    if (typeof externalInputRef === "function") {
      externalInputRef(node);
    } else if (externalInputRef) {
      (externalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  }

  useEffect(() => {
    if (!autoFocus) {
      return;
    }
    const timer = setTimeout(() => {
      localInputRef.current?.focus();
      localInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  // Scroll the active result into view when navigating with the keyboard.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const activeItem = container.querySelector('[aria-selected="true"]');
    if (activeItem) {
      (activeItem as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const searchIndex = useMemo(() => buildLensSearchIndex(lenses), [lenses]);
  const results = useMemo(
    () =>
      deferredQuery.trim()
        ? searchLensIndex(searchIndex, deferredQuery.trim(), 8)
        : [],
    [searchIndex, deferredQuery]
  );

  useSearchTelemetry({ query: deferredQuery, resultsCount: results.length, isOpen: true });

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      onSelectLens(results[activeIndex]);
    }
  }

  return (
    <>
      <div
        className={cn(
          "px-5",
          layout === "page"
            // Pin the input to the top of the scroll stream so only the results
            // scroll under it, while keeping the single whole-sheet scroll that
            // avoidKeyboard pads (no independent scroll region / magic spacer).
            ? "sticky top-0 z-10 bg-white pb-3 pt-4 dark:bg-zinc-950"
            : "pb-4"
        )}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-inner shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
          <label htmlFor={inputId} className="sr-only">
            {t("placeholder")}
          </label>
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            id={inputId}
            ref={setInputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={t("placeholder")}
            aria-controls={resultsId}
            aria-autocomplete="list"
            className="w-full border-0 bg-transparent text-base sm:text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
          />
          {query && (
            <button
              type="button"
              aria-label={t("clear")}
              onClick={() => {
                setQuery("");
                setActiveIndex(0);
                localInputRef.current?.focus();
              }}
              className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={cn(
          "px-3 pb-3",
          layout === "container"
            ? "h-[300px] overflow-y-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700"
            : ""
        )}
      >
        {query.trim().length === 0 ? null : results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-5 py-10 text-center dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("noResults")}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {t("noResultsHint")}
            </p>
            <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
              {t("suggestLens")}{" "}
              <FeedbackTrigger
                type="general"
                context={{ searchQuery: deferredQuery.trim() }}
              >
                {t("suggestLensLink")}
              </FeedbackTrigger>
            </p>
            <Link
              href="/about#coverage"
              className="mt-2 inline-block text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {t("coverageLink")}
            </Link>
          </div>
        ) : (
          <div
            id={resultsId}
            role="listbox"
            aria-label={t("results")}
            className="space-y-2"
          >
            {results.map((lens, index) => {
              const isActive = index === activeIndex;
              const resultState = getResultState?.(lens);
              const actionLabel = resultState?.actionLabel ?? t("view");
              const isDisabled = resultState?.disabled ?? false;

              return (
                <button
                  key={lens.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={isDisabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelectLens(lens)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors",
                    isDisabled
                      ? "cursor-not-allowed border-transparent bg-zinc-50/80 opacity-60 dark:bg-zinc-900/60"
                      : isActive
                        ? "border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50"
                        : "border-transparent bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                      {lensSubtitleLine(tBrand(lens.brand), lens.series)}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {lens.model}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                    {actionLabel}
                  </span>
                </button>
              );
            })}
            <p className="pt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {t("suggestLensResults")}{" "}
              <FeedbackTrigger
                type="general"
                context={{ searchQuery: deferredQuery.trim() }}
              >
                {t("suggestLensLink")}
              </FeedbackTrigger>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
