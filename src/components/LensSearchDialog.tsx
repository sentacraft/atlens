"use client";

import {
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { allLenses } from "@/lib/lens";
import { buildLensSearchIndex, searchLensIndex } from "@/lib/lens-search";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FeedbackTrigger from "./FeedbackTrigger";

interface LensSearchResultState {
  actionLabel?: string;
  disabled?: boolean;
}

const lensSearchIndex = buildLensSearchIndex(allLenses);

interface LensSearchDialogProps {
  onSelectLens?: (lens: Lens) => void;
  getResultState?: (lens: Lens) => LensSearchResultState | undefined;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerVariant?: "icon" | "button" | "slot";
}

export default function LensSearchDialog({
  onSelectLens,
  getResultState,
  triggerClassName,
  triggerLabel,
  triggerVariant = "icon",
}: LensSearchDialogProps) {
  const t = useTranslations("Search");
  const tBrand = useTranslations("Brands");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const resultsId = useId();
  const deferredQuery = useDeferredValue(query);

  // Auto-focus the input when the dialog opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Scroll active result into view when navigating with keyboard
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const activeItem = container.querySelector('[aria-selected="true"]');
    if (activeItem) {
      (activeItem as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const results = useMemo(
    () => searchLensIndex(lensSearchIndex, deferredQuery),
    [deferredQuery]
  );

  function handleSelect(lens: Lens) {
    setOpen(false);

    if (onSelectLens) {
      onSelectLens(lens);
      return;
    }

    router.push(`/lenses/${lens.id}`);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      handleSelect(results[activeIndex]);
      return;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel ?? t("open")}
        className={cn(
          triggerVariant === "icon"
            ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
            : triggerVariant === "button"
              ? "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
              : "group flex w-full flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50/60 text-center text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-100/70 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
          triggerClassName
        )}
      >
        {triggerVariant === "icon" && (
          <Search className="h-4 w-4" />
        )}
        {triggerVariant === "button" && (
          <>
            <Search className="h-4 w-4" />
            <span>{triggerLabel ?? t("add")}</span>
          </>
        )}
        {triggerVariant === "slot" && (
          <>
            <Search className="h-6 w-6 opacity-40 transition-opacity group-hover:opacity-70" />
            <span className="text-xs font-medium">
              {triggerLabel ?? t("addLens")}
            </span>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20 dark:border-zinc-800 dark:bg-zinc-950"
          showCloseButton
        >
          <DialogHeader className="border-b border-zinc-100 dark:border-zinc-800">
            <div className="pr-12">
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("description")}</DialogDescription>
            </div>

            <div className="mt-1 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 shadow-inner shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
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
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          <div
            ref={scrollContainerRef}
            className="h-[300px] overflow-y-auto px-3 py-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700"
          >
            {query.trim().length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-5 py-10 text-center dark:border-zinc-800">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {t("emptyTitle")}
                </p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {t("emptyDescription")}
                </p>
              </div>
            ) : results.length === 0 ? (
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
                    type="missing_lens"
                    context={{ searchQuery: deferredQuery.trim() }}
                    className="underline underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    {t("suggestLensLink")}
                  </FeedbackTrigger>
                </p>
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
                      onClick={() => handleSelect(lens)}
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
                          {tBrand(lens.brand)}
                          {lens.series ? ` · ${lens.series}` : ""}
                          {lens.generation ? ` · ${t("generation", { value: lens.generation })}` : ""}
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
