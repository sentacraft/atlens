"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens/search";
import type { SearchableLens } from "@/lib/lens/search";
import { cn } from "@/lib/utils";
import { lensSubtitleLine, brandLabel } from "@/lib/lens/format";
import { trackSearchSelect, useSearchTelemetry } from "@/components/browse/LensSearchDialog.telemetry";
import {
  Dialog,
  DialogClose,
  DialogPopup,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS } from "@/config/ui-tokens";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { aboutPath } from "@/lib/url/routes";

export interface LensSearchResultAction {
  label: string;
  disabled?: boolean;
}

export interface LensSearchContext {
  query: string;
  hasResults: boolean;
}

/** The lens search dialog. The caller renders its own trigger and owns the open state. */
export default function LensSearchDialog<T extends SearchableLens>({
  open,
  onOpenChange,
  lenses,
  title,
  resultAction,
  onSelect,
  afterResults,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lenses: T[];
  title: string;
  /** The label beside each result; a disabled result can't be picked. */
  resultAction: (lens: T) => LensSearchResultAction;
  /** Close the dialog here to end the search, or leave it open to pick again. */
  onSelect: (lens: T) => void;
  /** A line after the results, scrolling with them. Render components here; never call them. */
  afterResults?: (context: LensSearchContext) => ReactNode;
  /** A one-line bar pinned under the results, for the dialog's actions. */
  footer?: (context: LensSearchContext) => ReactNode;
}) {
  const t = useTranslations("Search");
  const tBrand = useTranslations("Brands");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollActiveRef = useRef(false);
  const inputId = useId();
  const resultsId = useId();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(null);
      setComposing(false);
    }
  }, [open]);

  const searchIndex = useMemo(
    () => buildLensSearchIndex(lenses),
    [lenses],
  );
  const results = useMemo(
    () => deferredQuery.trim()
      ? searchLensIndex(searchIndex, deferredQuery.trim(), 8)
      : [],
    [searchIndex, deferredQuery],
  );

  const hasInput = query.trim().length > 0;
  const hasResults = results.length > 0;
  const context = { query: deferredQuery.trim(), hasResults };
  const afterResultsContent = afterResults?.(context);
  const footerContent = footer?.(context);

  // Read activeRow, never activeIndex: an out-of-range index must not act as a row.
  const activeRow =
    activeIndex !== null && activeIndex < results.length ? activeIndex : null;

  // Keyboard moves only: a hovered row is already visible. Layout effect so the scroll lands in
  // the same frame as the highlight.
  useLayoutEffect(() => {
    if (!scrollActiveRef.current) {
      return;
    }
    scrollActiveRef.current = false;
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }
    const activeItem = container.querySelector('[aria-selected="true"]');
    if (activeItem) {
      (activeItem as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [activeRow]);

  useSearchTelemetry({
    query: deferredQuery,
    resultsCount: results.length,
    isOpen: open,
    isComposing: composing,
  });

  function pick(index: number) {
    const lens = results[index];
    trackSearchSelect({ query: deferredQuery, lensId: lens.id, rank: index + 1 });
    onSelect(lens);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      scrollActiveRef.current = true;
      setActiveIndex(
        activeRow === null || activeRow >= results.length - 1 ? 0 : activeRow + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) {
        return;
      }
      scrollActiveRef.current = true;
      setActiveIndex(
        activeRow === null || activeRow <= 0 ? results.length - 1 : activeRow - 1
      );
      return;
    }

    if (event.key === "Enter" && activeRow !== null) {
      event.preventDefault();
      pick(activeRow);
      return;
    }
  }

  function renderResults() {
    if (!hasInput) {
      return null;
    }
    if (!hasResults) {
      return renderNoMatches();
    }
    return renderMatchList();
  }

  function renderNoMatches() {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 px-5 py-10 text-center">
        <p className="text-sm font-medium text-zinc-700">
          {t("noResults")}
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          {t("noResultsHint")}
        </p>
      </div>
    );
  }

  function renderMatchList() {
    return (
      <div
        id={resultsId}
        role="listbox"
        aria-label={t("results")}
        // On the list, not each row: scrolling a row out from under a still pointer fires a row leave.
        onMouseLeave={() => setActiveIndex(null)}
        className="space-y-2"
      >
        {results.map((lens, index) => {
          const isActive = index === activeRow;
          const action = resultAction(lens);
          const isDisabled = action.disabled ?? false;

          return (
            <button
              key={lens.id}
              type="button"
              role="option"
              aria-selected={isActive}
              disabled={isDisabled}
              // onMouseMove, not onMouseEnter: scrolling a row under a still pointer fires enter.
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => pick(index)}
              className={cn(
                "flex w-full scroll-my-2 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left",
                isDisabled
                  ? "cursor-not-allowed border-transparent bg-zinc-50/80 opacity-60"
                  // No :hover background: it would linger on the row under the pointer after a keyboard move.
                  : isActive
                    ? "border-zinc-200 bg-zinc-50/80"
                    : "border-transparent bg-white"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.14em] text-zinc-500">
                  {lensSubtitleLine(brandLabel(tBrand, lens.brand), lens.series)}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-zinc-900">
                  {lens.model}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-zinc-400">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Base UI focuses the popup, not the input, on touch-open; hand it the input so the keyboard opens. */}
      <DialogPopup
        initialFocus={inputRef}
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20"
      >
        <DialogHeader className="border-b border-zinc-100 pr-5">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="min-w-0">{title}</DialogTitle>
            <DialogClose className={cn(ICON_CLOSE_BTN_CLS, FROSTED_OVERLAY_CHROME_CLS, "hidden h-9 w-9 shrink-0 sm:inline-flex")}>
              <X className="h-4 w-4" />
            </DialogClose>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-inner shadow-zinc-200/30">
            <label htmlFor={inputId} className="sr-only">
              {t("placeholder")}
            </label>
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                setActiveIndex(value.trim() ? 0 : null);
              }}
              onKeyDown={handleInputKeyDown}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              placeholder={t("placeholder")}
              aria-controls={resultsId}
              aria-autocomplete="list"
              className="w-full border-0 bg-transparent text-base sm:text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
            />
            {query && (
              <button
                type="button"
                aria-label={t("clear")}
                onClick={() => {
                  setQuery("");
                  setActiveIndex(null);
                  inputRef.current?.focus();
                }}
                className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          // Stops a result tap from starting Base UI's swipe tracking, which flashes the drawer on iOS.
          // Only on this natively scrollable region: the attribute also disables the background-scroll guard.
          data-base-ui-swipe-ignore=""
          className="h-[300px] overflow-y-auto px-3 py-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200"
        >
          {renderResults()}
          {afterResultsContent && <div className="pt-3">{afterResultsContent}</div>}
        </div>
        {footerContent && (
          <DialogFooter className="justify-between border-zinc-100 py-3">{footerContent}</DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}

/** The catalog search's line after the results: "missing a lens? tell us", once there is a query. */
export function suggestMissingLens(context: LensSearchContext) {
  return context.query ? <SuggestMissingLens {...context} /> : null;
}

function SuggestMissingLens({ query, hasResults }: LensSearchContext) {
  const t = useTranslations("Search");
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-400">
      <span>
        {t(hasResults ? "suggestLensResults" : "suggestLens")}{" "}
        <FeedbackTrigger type="general" context={{ searchQuery: query }}>
          {t("suggestLensLink")}
        </FeedbackTrigger>
      </span>
      {!hasResults && (
        <Link
          href={aboutPath("coverage")}
          className="transition-colors hover:text-zinc-600"
        >
          {t("coverageLink")}
        </Link>
      )}
    </p>
  );
}
