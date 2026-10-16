"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Columns2, LayoutGrid, X } from "lucide-react";
import { LensSilhouette } from "@/components/ui/lens-silhouette";
import { describeFilters, parsePagePath, type PageRef } from "@/lib/askiris/page-ref";
import type { LensSummary } from "@/lib/lens/data";
import { lensDisplayName } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { cn } from "@/lib/utils";

/** The page a conversation is about, as the chat shows it. */
export interface PageContextView {
  kind: PageRef["kind"];
  /** "Looking at", "Comparing 2". */
  label: string;
  title: string;
  /** The lens to picture, on a lens page. */
  lensId?: string;
  /** What the "back to" link names. */
  pageName: string;
  heading: string;
  suggestions: string[];
  placeholder: string;
}

export function usePageContextView(path: string | null, lenses: LensSummary[]): PageContextView | null {
  const t = useTranslations("IrisEntry");
  const tBrand = useTranslations("Brands");
  const tList = useTranslations("LensList");
  const tBadge = useTranslations("SpecialtyBadge");
  const page = useMemo(() => (path ? parsePagePath(path) : null), [path]);

  if (!page) {
    return null;
  }
  const brand = (slug: string) => (tBrand.has(slug) ? tBrand(slug) : slug);
  if (page.kind === "browse") {
    const filters = describeFilters(page.filters, { brand, list: (key) => tList(key), badge: (key) => tBadge(key) });
    return {
      kind: "browse",
      label: t("browsing"),
      title: filters.length > 0 ? filters.join(" · ") : t("noFilters"),
      pageName: t("browseName"),
      heading: t("browseHeading"),
      suggestions: t.raw("browseSuggestions") as string[],
      placeholder: t("browsePlaceholder"),
    };
  }
  const ids = page.kind === "compare" ? page.lensIds : [page.lensId];
  const found = ids
    .map((id) => lenses.find((lens) => lens.id === id && lens.mount === page.mount))
    .filter((lens): lens is LensSummary => lens !== undefined);
  if (found.length === 0) {
    return null;
  }
  if (page.kind === "compare") {
    return {
      kind: "compare",
      label: t("comparing", { count: found.length }),
      title: found.map((lens) => lens.model).join(" · "),
      pageName: t("compareName"),
      heading: t("compareHeading"),
      suggestions: t.raw("compareSuggestions") as string[],
      placeholder: t("comparePlaceholder"),
    };
  }
  const [lens] = found;
  const name = lensDisplayName(brand(lens.brand), lens.series, lens.model);
  return {
    kind: "lens",
    label: t("lookingAt"),
    title: name,
    lensId: lens.id,
    pageName: name,
    heading: t("lensHeading"),
    suggestions: t.raw("lensSuggestions") as string[],
    placeholder: t("lensPlaceholder"),
  };
}

/** Shows what the chat sends Iris about the page; the × stops sending it. */
export function PageContextCard({
  view,
  variant,
  onDetach,
}: {
  view: PageContextView;
  /** card: before the first question; chip: one line above the conversation. */
  variant: "card" | "chip";
  onDetach: () => void;
}) {
  const t = useTranslations("IrisEntry");
  const detach = (
    <button
      type="button"
      onClick={onDetach}
      aria-label={t("detach")}
      title={t("detach")}
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      <X className={variant === "chip" ? "size-3" : "size-3.5"} />
    </button>
  );

  if (variant === "chip") {
    return (
      <div className="flex min-w-0 items-center gap-1 self-start rounded-full bg-zinc-100 py-0.5 pr-0.5 pl-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        <span className="truncate">
          {view.label} · {view.title}
        </span>
        {detach}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 py-2.5 pr-1.5 pl-2.5 text-left dark:border-zinc-800 dark:bg-zinc-900">
      <PageThumb view={view} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{view.label}</span>
        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{view.title}</span>
      </div>
      {detach}
    </div>
  );
}

function PageThumb({ view }: { view: PageContextView }) {
  const [failed, setFailed] = useState(false);
  const Icon = view.kind === "compare" ? Columns2 : LayoutGrid;
  return (
    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {!view.lensId ? (
        <Icon className="size-4" />
      ) : failed ? (
        <LensSilhouette className="size-7" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- catalog webp; images are unoptimized on Workers
        <img src={getLensImageUrl(view.lensId)} alt="" onError={() => setFailed(true)} className="size-full object-contain p-0.5" />
      )}
    </div>
  );
}

/** A chat's start when it is about a page: what it knows, a few questions to send, and the composer. */
export function PageContextStart({
  view,
  notice,
  onDetach,
  onSuggestion,
  disabled,
  composer,
}: {
  view: PageContextView;
  notice: ReactNode;
  onDetach: () => void;
  onSuggestion: (text: string) => void;
  disabled: boolean;
  composer: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pb-4">
      {notice}
      <PageContextCard view={view} variant="card" onDetach={onDetach} />
      <div className="flex flex-1 flex-col justify-end gap-2">
        <p className="mb-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{view.heading}</p>
        {view.suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestion(suggestion)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm text-zinc-800 transition-colors",
              "hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900",
            )}
          >
            {suggestion}
            <span aria-hidden className="text-zinc-400">↑</span>
          </button>
        ))}
      </div>
      {composer}
    </div>
  );
}
