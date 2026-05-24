"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavLock } from "@/context/ScrollContainerContext";
import { usePwa } from "@/lib/usePwa";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { ArrowUpRight, ChevronLeft, ChevronRight, Flag, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_CLOSE_BTN_CLS, TEXT_LINK_CLS } from "@/lib/ui-tokens";
import { BoolCell } from "@/components/ui/bool-cell";
import { FieldNotePopover } from "@/components/ui/field-note-popover";
import SpecialtyBadges from "@/components/SpecialtyBadges";
import { deriveSpecialty } from "@/lib/lens-specialty";
import FeedbackTrigger from "@/components/FeedbackTrigger";
import type { FeedbackField } from "@/components/FeedbackDialog";
import { useCompare } from "@/context/CompareProvider";
import { useCompareLensSearch } from "@/hooks/useCompareLensSearch";
import { useCompareUrlSync } from "@/hooks/useCompareUrlSync";
import { getLensesByMount, getLensUrl, MAX_COMPARE } from "@/lib/lens";
import { useEffectiveMount } from "@/hooks/useMountParam";
import LensSearchDialog from "@/components/LensSearchDialog";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens-image";
import { buildSpecGroups, resolveSpecRow } from "@/lib/lens-spec-groups";
import type { StructuredLine, ResolvedSpecRow } from "@/lib/lens-spec-groups";
import type { Lens } from "@/lib/types";
import { PriceCell } from "@/components/PriceCell";
import { pickPriceEntry, formatPriceForReport } from "@/lib/lens-pricing";
import { lensDisplayName, lensSubtitleLine } from "@/lib/lens.format";

// --- LensHeaderContent: shared inner card content ---

function LensHeaderContent({
  lens,
}: {
  lens: Lens;
}) {
  const tBrand = useTranslations("Brands");

  return (
    <>
      <div className="mb-1 flex w-full max-w-[80px] items-center justify-center overflow-hidden rounded-xl bg-zinc-50/70 p-1.5 sm:mb-2 sm:max-w-[160px] sm:p-3 dark:bg-zinc-900/50">
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            src={getLensImageUrl(lens.id)}
            alt={lens.model}
            fill
            sizes="(min-width: 640px) 160px, 80px"
            style={lensImageStyle}
            className="object-contain"
            priority
          />
        </div>
      </div>

      <p className="text-center text-xs font-normal text-zinc-500 dark:text-zinc-400">
        {lensSubtitleLine(tBrand(lens.brand), lens.series)}
      </p>
      <div className="my-1.5 flex min-h-[1.5rem] flex-wrap items-center justify-center gap-1.5">
        <SpecialtyBadges {...deriveSpecialty(lens)} />
      </div>
      <p className="line-clamp-3 text-center font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
        {lens.model}
      </p>
    </>
  );
}

// --- LensHeader ---

function LensHeader({
  lens,
  url,
  officialSiteLabel,
  reportIssueLabel,
  feedbackFields,
  removeLabel,
  shiftLeftLabel,
  shiftRightLabel,
  canShiftLeft,
  canShiftRight,
  onRemove,
  onShiftLeft,
  onShiftRight,
}: {
  lens: Lens;
  url: string | null | undefined;
  officialSiteLabel: string;
  reportIssueLabel: string;
  feedbackFields: FeedbackField[] | undefined;
  removeLabel: string;
  shiftLeftLabel: string;
  shiftRightLabel: string;
  canShiftLeft: boolean;
  canShiftRight: boolean;
  onRemove: () => void;
  onShiftLeft: () => void;
  onShiftRight: () => void;
}) {
  const tBrand = useTranslations("Brands");

  return (
    <th className="group relative z-20 h-px align-top border-l border-zinc-200 bg-zinc-50 px-3 py-1 text-left transition-colors sm:py-1.5 sm:group-hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:sm:group-hover:bg-zinc-800">
      {/* Outer wrapper stretches to full cell height (h-full + h-px on th).
          On mobile the action buttons are in normal flow; on sm+ they are
          absolutely positioned so they overlap the card content on hover. */}
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-1 transition-opacity sm:absolute sm:inset-x-3 sm:top-1.5 sm:z-10 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className={cn(ICON_CLOSE_BTN_CLS, "h-8 w-8")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex items-center gap-3 sm:gap-2">
            <button
              type="button"
              onClick={onShiftLeft}
              disabled={!canShiftLeft}
              aria-label={shiftLeftLabel}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors active:bg-zinc-200 active:text-zinc-800 hover:bg-zinc-200 hover:text-zinc-700 disabled:cursor-default disabled:opacity-30 disabled:active:bg-transparent disabled:hover:bg-transparent sm:text-zinc-500 dark:text-zinc-300 dark:active:bg-zinc-700 dark:active:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 dark:sm:text-zinc-400"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onShiftRight}
              disabled={!canShiftRight}
              aria-label={shiftRightLabel}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-600 transition-colors active:bg-zinc-200 active:text-zinc-800 hover:bg-zinc-200 hover:text-zinc-700 disabled:cursor-default disabled:opacity-30 disabled:active:bg-transparent disabled:hover:bg-transparent sm:text-zinc-500 dark:text-zinc-300 dark:active:bg-zinc-700 dark:active:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 dark:sm:text-zinc-400"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {/* flex-1 fills remaining space after action buttons so mt-auto
            on links works without overflowing the cell */}
        <div className="mt-1 flex flex-1 flex-col items-center text-center sm:mt-0">
          <LensHeaderContent lens={lens} />
          {/* Official site + report links — mt-auto pushes to bottom so
              links across columns align even when model names differ in height */}
          <div className="mt-auto flex flex-col items-center gap-0 pt-1.5">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap py-0.5 ${TEXT_LINK_CLS}`}
              >
                <ArrowUpRight className="h-3 w-3 shrink-0" />
                {officialSiteLabel}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap py-0.5 text-zinc-300 dark:text-zinc-600 cursor-not-allowed">
                <ArrowUpRight className="h-3 w-3 shrink-0" />
                {officialSiteLabel}
              </span>
            )}
            <FeedbackTrigger
              type="data_issue"
              context={{ lensId: lens.id, lensModel: lens.model, lensBrand: tBrand(lens.brand) }}
              fields={feedbackFields}
              className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap py-0.5 ${TEXT_LINK_CLS}`}
            >
              <Flag className="h-3 w-3 shrink-0" />
              {reportIssueLabel}
            </FeedbackTrigger>
          </div>
        </div>
      </div>
    </th>
  );
}

// --- EmptyLensHeader: placeholder column header with a search trigger ---

function EmptyLensHeader({
  addLensLabel,
  onSelectLens,
  getResultState,
}: {
  addLensLabel: string;
  onSelectLens: (lens: Lens) => void;
  getResultState: (lens: Lens) => { actionLabel: string; disabled: boolean };
}) {
  return (
    // h-px is the CSS trick that allows children to use h-full inside a table cell
    <th className="h-px align-top border-l border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <LensSearchDialog
        onSelectLens={onSelectLens}
        getResultState={getResultState}
        triggerVariant="slot"
        triggerLabel={addLensLabel}
        triggerClassName="h-full w-full min-h-[110px] rounded-2xl"
      />
    </th>
  );
}

// --- LinksRow: official site + report links, rendered at both top and bottom ---

function LinksRow({
  orderedLenses,
  emptySlotCount,
  lensFields,
  url: getUrl,
  officialSiteLabel,
  reportIssueLabel,
  tBrand: getBrand,
  border,
}: {
  orderedLenses: Lens[];
  emptySlotCount: number;
  lensFields: Map<string, import("@/components/FeedbackDialog").FeedbackField[]>;
  url: (lens: Lens) => string | null | undefined;
  officialSiteLabel: string;
  reportIssueLabel: string;
  tBrand: (brand: string) => string;
  border: "top" | "bottom";
}) {
  const borderCls =
    border === "top"
      ? "border-t border-zinc-200 dark:border-zinc-800"
      : "border-b border-zinc-200 dark:border-zinc-800";

  return (
    <tr className={`${borderCls} bg-zinc-100/80 dark:bg-zinc-800/60`}>
      <td className="sticky left-0 z-10 bg-zinc-100 px-3 py-2 dark:bg-zinc-800" />
      {orderedLenses.map((lens) => {
        const url = getUrl(lens);
        const fields = lensFields.get(lens.id);
        return (
          <td key={lens.id} className="px-3 py-2">
            <div className="flex flex-col items-center justify-center gap-0.5">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap py-1 ${TEXT_LINK_CLS}`}
                >
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  {officialSiteLabel}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap py-1 text-zinc-300 dark:text-zinc-600 cursor-not-allowed">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  {officialSiteLabel}
                </span>
              )}
              <FeedbackTrigger
                type="data_issue"
                context={{ lensId: lens.id, lensModel: lens.model, lensBrand: getBrand(lens.brand) }}
                fields={fields}
                className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap py-1 ${TEXT_LINK_CLS}`}
              >
                <Flag className="h-3 w-3 shrink-0" />
                {reportIssueLabel}
              </FeedbackTrigger>
            </div>
          </td>
        );
      })}
      {Array.from({ length: emptySlotCount }).map((_, i) => (
        <td key={`empty-links-${border}-${i}`} className="border-l border-zinc-200 dark:border-zinc-800" />
      ))}
    </tr>
  );
}

// --- CompareTable ---

interface Props {
  lenses: Lens[];
  /** Minimum number of columns to display; empty slot headers fill the gap. */
  minColumns?: number;
  /** When true and the compare list is empty, only the header row is rendered (no skeleton body). */
  hideBodyWhenEmpty?: boolean;
}

const LABEL_COLUMN_WIDTH = "6rem";
const LENS_COLUMN_MIN_WIDTH = "9rem";

export default function CompareTable({ lenses: initialLenses, minColumns = 0, hideBodyWhenEmpty = false }: Props) {
  const t = useTranslations("Compare");
  const td = useTranslations("LensDetail");
  const tBrand = useTranslations("Brands");
  const tPricing = useTranslations("Pricing");
  const locale = useLocale();
  const priceFieldLabel = tPricing("fieldLabel");
  const priceGroupLabel = tPricing("groupLabel");
  const { compareIds, reorder, remove, seed } = useCompare();
  const { onSelectLens, getResultState } = useCompareLensSearch();
  // Compare page is the only surface that projects compare state onto the
  // URL. This hook owns that projection so individual write callsites no
  // longer need to know about address-bar bookkeeping.
  useCompareUrlSync();
  const mount = useEffectiveMount();
  const initialLensIds = useMemo(
    () => initialLenses.map((lens) => lens.id),
    [initialLenses]
  );

  // Context is the single client-side source of truth. The URL is a write-only
  // projection updated via history.replaceState (no RSC round-trip).
  //
  // useLayoutEffect so the seed lands BEFORE the browser paints. This means
  // every context consumer (ComparePageHeader, CompareBar, …) sees
  // the correct compareIds on the first visible frame — no fallback props or
  // "hydrated" flags required.
  //
  // The seed is a no-op for in-page mutations because those don't change
  // initialLenses. It also fires on subsequent navigations (e.g., a curated
  // preset link click that re-renders the server component with new
  // searchParams).
  useLayoutEffect(() => {
    seed(initialLensIds);
  }, [initialLensIds, seed]);

  const orderedLenses = compareIds
    .map((id) => getLensesByMount(mount, locale).find((lens) => lens.id === id))
    .filter((lens): lens is Lens => lens !== undefined);

  // Number of empty slot columns to render (search triggers filling up to minColumns)
  const emptySlotCount = Math.max(0, minColumns - orderedLenses.length);

  const valueCellLabels = useMemo(() => ({
    yes: td("yes"),
    no: td("no"),
    partial: td("partial"),
    unknown: td("unknown"),
    missing: td("missing"),
  }), [td]);

  function handleShiftLens(lensId: string, direction: -1 | 1) {
    const fromIndex = compareIds.indexOf(lensId);
    const toIndex = fromIndex + direction;

    reorder(fromIndex, toIndex);
  }

  const allGroups = useMemo(
    () =>
      buildSpecGroups({
        groupOptics: td("groupOptics"),
        groupFocus: td("groupFocus"),
        groupStabilization: td("groupStabilization"),
        groupPhysical: td("groupPhysical"),
        groupFeatures: td("groupFeatures"),
        groupRelease: td("groupRelease"),
        focalLength: td("focalLength"),
        focalLengthEquiv: td("focalLengthEquiv"),
        maxAperture: td("maxAperture"),
        minAperture: td("minAperture"),
        maxTStop: td("maxTStop"),
        minTStop: td("minTStop"),
        angleOfView: td("angleOfView"),
        angleOfViewEstNote: td("angleOfViewEstNote"),
        apertureBladeCount: td("apertureBladeCount"),
        lensConfiguration: td("lensConfiguration"),
        af: td("af"),
        focusMotor: td("focusMotor"),
        internalFocusing: td("internalFocusing"),
        minFocusDist: td("minFocusDist"),
        maxMagnification: td("maxMagnification"),
        ois: td("ois"),
        weight: td("weight"),
        dimensions: td("dimensions"),
        filterSize: td("filterSize"),
        lensMaterial: td("lensMaterial"),
        wr: td("wr"),
        apertureRing: td("apertureRing"),
        powerZoom: td("powerZoom"),
        releaseYear: td("releaseYear"),
        releaseYearLabelNote: td("releaseYearLabelNote"),
        accessories: td("accessories"),
        yes: td("yes"),
        no: td("no"),
        partial: td("partial"),
        retracted: td("lengthRetracted"),
        wide: td("lengthWide"),
        tele: td("lengthTele"),
        lc: {
          groups: td("lcGroups"),
          elements: td("lcElements"),
          aspherical: td("lcAspherical"),
          ed: td("lcEd"),
          superEd: td("lcSuperEd"),
          sld: td("lcSld"),
          fld: td("lcFld"),
          highRefractive: td("lcHighRefractive"),
          incl: td("lcIncl"),
        },
        motorClass: {
          linear: td("motorLinear"),
          stepping: td("motorStepping"),
          dc: td("motorDc"),
          other: td("motorOther"),
        },
      }),
    [td]
  );

  // Resolve all row values once per (lens, row) pair — single source of truth
  // for both the rendered cells and the Report Dialog's field list.
  const resolvedPerLens = useMemo(() => {
    const map = new Map<string, Map<string, ResolvedSpecRow>>();
    for (const lens of orderedLenses) {
      const rowMap = new Map<string, ResolvedSpecRow>();
      for (const group of allGroups) {
        for (const row of group.rows) {
          const resolved = resolveSpecRow(row, lens, valueCellLabels);
          if (resolved) {
            rowMap.set(row.label, resolved);
          }
        }
      }
      map.set(lens.id, rowMap);
    }
    return map;
  }, [allGroups, orderedLenses, valueCellLabels]);

  // Per-view suppression: hide rows where no compared lens has data.
  const visibleGroups = useMemo(
    () =>
      allGroups
        .map((group) => ({
          ...group,
          rows: group.rows.filter((row) =>
            orderedLenses.some((l) => resolvedPerLens.get(l.id)?.has(row.label))
          ),
        }))
        .filter((group) => group.rows.length > 0),
    [allGroups, orderedLenses, resolvedPerLens]
  );

  // Per-lens Report Dialog fields — derived from resolved values, identical to
  // what is rendered in the table cells.
  const lensFields = useMemo(() => {
    const map = new Map<string, FeedbackField[]>();
    const mediaGroupLabel = td("fieldGroupMedia");
    for (const lens of orderedLenses) {
      const rowMap = resolvedPerLens.get(lens.id);
      if (!rowMap) {
        continue;
      }
      const fields: FeedbackField[] = [];
      for (const group of allGroups) {
        for (const row of group.rows) {
          const resolved = rowMap.get(row.label);
          if (resolved) {
            fields.push({ label: resolved.label, currentValue: resolved.plainText, group: group.label });
          }
        }
      }
      const url = getLensUrl(lens, locale);
      if (url) {
        fields.push({ label: td("fieldOfficialLink"), currentValue: url, group: mediaGroupLabel });
      }
      fields.push({ label: td("fieldLensImage"), currentValue: getLensImageUrl(lens.id), group: mediaGroupLabel, hideCurrentValue: true });
      const priceSelection = pickPriceEntry(lens.pricing, locale);
      if (priceSelection) {
        fields.push({ label: priceFieldLabel, currentValue: formatPriceForReport(priceSelection, locale, tPricing), group: priceGroupLabel });
      }
      map.set(lens.id, fields);
    }
    return map;
  }, [resolvedPerLens, allGroups, orderedLenses, td, tPricing, priceFieldLabel, priceGroupLabel, locale]);

  const totalColSpan = orderedLenses.length + 1 + emptySlotCount;
  const { lockNav } = useNavLock();
  const isPwa = usePwa();

  // --- Phantom sticky header ---
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const phantomInnerRef = useRef<HTMLDivElement>(null);
  const [showPhantom, setShowPhantom] = useState(false);
  const [colWidths, setColWidths] = useState<number[]>([]);

  useEffect(() => {
    const thead = theadRef.current;
    if (!thead) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowPhantom(!entry.isIntersecting),
      { root: null, rootMargin: "0px", threshold: 0 },
    );
    observer.observe(thead);
    return () => observer.disconnect();
  }, []);

  // phantomVisible is the single source of truth for whether the phantom header
  // is active. lockNav mirrors it so the two stay in sync automatically.
  const phantomVisible = showPhantom && orderedLenses.length > 0;

  useEffect(() => {
    if (!isPwa) {
      lockNav(phantomVisible);
    }
  }, [phantomVisible, lockNav, isPwa]);

  useEffect(() => {
    const container = containerRef.current;
    const thead = theadRef.current;
    if (!container || !thead) {
      return;
    }

    const update = () => {
      const row = thead.querySelector("tr");
      if (row) {
        const cells = row.querySelectorAll("th");
        setColWidths(Array.from(cells).map((c) => c.getBoundingClientRect().width));
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [compareIds]);

  useEffect(() => {
    const container = containerRef.current;
    const thead = theadRef.current;
    if (!container || !thead) {
      return;
    }
    const onScroll = () => {
      if (phantomInnerRef.current) {
        phantomInnerRef.current.style.transform = `translateX(-${container.scrollLeft}px)`;
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
    {/* Phantom sticky header: h-0 so it takes no layout space; sticky (not fixed)
        so it bounces with content during iOS overscroll instead of staying put */}
    <div data-testid="compare-phantom-container" className={`sticky z-20 h-0 overflow-x-clip ${isPwa ? "top-[var(--nav-height)]" : "top-[var(--safe-inset-top)] sm:top-[var(--nav-height)]"}`}>
      <div
        data-testid="compare-phantom-header"
        data-visible={String(phantomVisible)}
        className={`absolute left-0 right-0 top-0 transition-all duration-200 ${
          phantomVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
      <div className="overflow-hidden border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="flex">
        {/* Fixed blank area matching the sticky label column — never scrolls */}
        {colWidths[0] != null && (
          <div style={{ width: colWidths[0], flexShrink: 0 }} />
        )}
        {/* Lens columns only — translateX syncs with table horizontal scroll */}
        <div className="flex-1 overflow-hidden">
          <div ref={phantomInnerRef} className="flex">
            {orderedLenses.map((lens, i) => (
              <div
                key={lens.id}
                style={{ width: colWidths[i + 1], flexShrink: 0 }}
                className="px-2 py-1.5 text-center"
              >
                <p className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                  {lensSubtitleLine(tBrand(lens.brand), lens.series)}
                </p>
                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                  {lens.model}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
    <div ref={containerRef} className="isolate overflow-x-auto overflow-y-clip rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table
        className={cn("w-full table-fixed text-sm border-collapse", orderedLenses.length > 0 && "min-w-max")}
        style={
          orderedLenses.length > 0
            ? { minWidth: `calc(${LABEL_COLUMN_WIDTH} + ${orderedLenses.length} * ${LENS_COLUMN_MIN_WIDTH})` }
            : undefined
        }
      >
        <colgroup>
          <col style={{ width: LABEL_COLUMN_WIDTH }} />
          {orderedLenses.map((lens) => (
            <col key={lens.id} style={{ width: LENS_COLUMN_MIN_WIDTH }} />
          ))}
          {Array.from({ length: emptySlotCount }).map((_, i) => (
            // Empty state: no fixed width — table-fixed distributes remaining space evenly
            <col key={`empty-col-${i}`} style={orderedLenses.length > 0 ? { width: LENS_COLUMN_MIN_WIDTH } : undefined} />
          ))}
        </colgroup>

        <thead ref={theadRef}>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="sticky left-0 z-30 bg-zinc-50 px-3 py-3 dark:bg-zinc-900">
              {orderedLenses.length === 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {t("emptyHint", { count: MAX_COMPARE })}
                </span>
              )}
            </th>
            {orderedLenses.map((lens, index) => (
              <LensHeader
                key={lens.id}
                lens={lens}
                url={getLensUrl(lens, locale)}
                officialSiteLabel={t("officialSite")}
                reportIssueLabel={t("reportIssue")}
                feedbackFields={lensFields.get(lens.id)}
                removeLabel={t("removeLens", { model: lensDisplayName(tBrand(lens.brand), lens.series, lens.model) })}
                shiftLeftLabel={t("shiftLeft")}
                shiftRightLabel={t("shiftRight")}
                canShiftLeft={index > 0}
                canShiftRight={index < orderedLenses.length - 1}
                onRemove={() => remove(lens.id)}
                onShiftLeft={() => handleShiftLens(lens.id, -1)}
                onShiftRight={() => handleShiftLens(lens.id, 1)}
              />
            ))}
            {Array.from({ length: emptySlotCount }).map((_, i) => (
              <EmptyLensHeader
                key={`empty-header-${i}`}
                addLensLabel={
                  orderedLenses.length === 0
                    ? i === 0 ? t("selectFirst") : t("addMore")
                    : t("addLens")
                }
                onSelectLens={onSelectLens}
                getResultState={getResultState}
              />
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Cold-start skeleton: show all spec dimensions with placeholder cells */}
          {orderedLenses.length === 0 && !hideBodyWhenEmpty && allGroups.map((group) => (
            <React.Fragment key={group.label}>
              <tr className="border-b border-zinc-100 bg-zinc-100/80 dark:border-zinc-800/60 dark:bg-zinc-800/60">
                <td colSpan={totalColSpan} className="h-8 text-center">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {group.label}
                  </span>
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
                  <td className="sticky left-0 z-10 px-3 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 break-words">
                    <div className="flex items-center justify-end gap-1">
                      {row.labelNote && <FieldNotePopover note={row.labelNote} variant={row.labelNoteVariant} />}
                      <span>{row.label}</span>
                    </div>
                  </td>
                  {Array.from({ length: emptySlotCount }).map((_, i) => (
                    <td key={i} className="px-3 py-3 text-center text-xs text-zinc-200 dark:text-zinc-800">
                      —
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}

          {/* Pricing group — shown when at least one lens has pricing data.
              Disclaimer rows are rendered OUTSIDE the scrollable table so
              they wrap within viewport width instead of being clipped by the
              horizontal overflow container. */}
          {orderedLenses.length > 0 && orderedLenses.some((l) => pickPriceEntry(l.pricing, locale) !== null) && (
            <React.Fragment>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
                <td className="sticky left-0 z-10 px-3 py-3 bg-zinc-50 dark:bg-zinc-900 break-words align-middle">
                  {/* Two-line label: row name on top, single action-oriented
                      warn below. Compact enough to avoid orphan characters
                      even in the narrow (6rem) sticky label column. */}
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {tPricing("rowLabel")}
                    </span>
                    <span className="text-[11px] leading-tight text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="inline-block align-[-0.125em] size-3 mr-0.5" aria-hidden="true" />
                      {tPricing("rowWarn")}
                    </span>
                  </div>
                </td>
                {orderedLenses.map((lens) => {
                  const sel = pickPriceEntry(lens.pricing, locale);
                  if (!sel) {
                    return (
                      <td key={lens.id} className="px-3 py-3 text-center text-zinc-400 dark:text-zinc-600">
                        {valueCellLabels.missing}
                      </td>
                    );
                  }
                  return (
                    <td key={lens.id} className="px-3 py-3">
                      <div className="flex justify-center">
                        <PriceCell lens={lens} compact />
                      </div>
                    </td>
                  );
                })}
                {Array.from({ length: emptySlotCount }).map((_, i) => (
                  <td key={`empty-price-${i}`} className="border-l border-zinc-100 bg-white dark:border-zinc-800/60 dark:bg-zinc-950" />
                ))}
              </tr>
            </React.Fragment>
          )}

          {/* Populated table: only rendered when at least one lens is selected */}
          {orderedLenses.length > 0 && visibleGroups.map((group) => {
            return (
              <React.Fragment key={group.label}>
                {/* Group header row.
                    The label is absolutely positioned at --section-center (updated
                    on scroll/resize) so it stays centered in the visible content
                    pane regardless of horizontal scroll position. */}
                <tr className="border-b border-zinc-100 bg-zinc-100/80 dark:border-zinc-800/60 dark:bg-zinc-800/60">
                  <td colSpan={totalColSpan} className="h-8 text-center">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {group.label}
                    </span>
                  </td>
                </tr>

                {/* Data rows */}
                {group.rows.map((row) => {
                  // Compute best value for numeric rows using pre-resolved comparables.
                  let bestVal: number | null = null;
                  if (row.kind === "numeric" && row.bestDir) {
                    const vals = orderedLenses
                      .map((l) => {
                        const r = resolvedPerLens.get(l.id)?.get(row.label);
                        return r?.kind === "numeric" ? r.comparable : undefined;
                      })
                      .filter((v): v is number => v !== undefined);
                    if (vals.length > 1) {
                      bestVal =
                        row.bestDir === "min"
                          ? Math.min(...vals)
                          : Math.max(...vals);
                    }
                  }

                  return (
                    <tr
                      key={row.label}
                      className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                    >
                      {/* Label cell */}
                      <td className="sticky left-0 z-10 px-3 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 break-words">
                        <div className="flex items-center justify-end gap-1">
                          {row.labelNote && <FieldNotePopover note={row.labelNote} variant={row.labelNoteVariant} />}
                          <span>{row.label}</span>
                        </div>
                      </td>

                      {/* Value cells — filled lenses */}
                      {orderedLenses.map((lens) => {
                        const resolved = resolvedPerLens.get(lens.id)?.get(row.label);

                        // Lens has no data for this row — render empty cell.
                        if (!resolved) {
                          return (
                            <td
                              key={lens.id}
                              className="px-3 py-3 text-center text-zinc-400 dark:text-zinc-600"
                            >
                              {valueCellLabels.missing}
                            </td>
                          );
                        }

                        if (resolved.kind === "bool") {
                          return (
                            <td
                              key={lens.id}
                              className="px-3 py-3 text-center text-zinc-700 dark:text-zinc-300"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <div>
                                  <BoolCell
                                    value={resolved.boolValue}
                                    yes={valueCellLabels.yes}
                                    no={valueCellLabels.no}
                                    partial={valueCellLabels.partial}
                                    unknown={valueCellLabels.missing}
                                  />
                                  {resolved.subValue && (
                                    <p className="mt-0.5 text-[11px] leading-relaxed font-normal text-zinc-400 dark:text-zinc-500">
                                      {resolved.subValue}
                                    </p>
                                  )}
                                </div>
                                {resolved.note && <FieldNotePopover note={resolved.note} />}
                              </div>
                            </td>
                          );
                        }

                        if (resolved.kind === "numeric") {
                          const isBest =
                            bestVal !== null && resolved.comparable === bestVal;
                          const fragment = isBest ? resolved.highlightFragment : undefined;

                          // --- Structured multi-line rendering ---
                          if (resolved.structuredLines && resolved.structuredLines.length > 0) {
                            return (
                              <td
                                key={lens.id}
                                className="px-3 py-3 text-center font-medium tabular-nums text-zinc-700 dark:text-zinc-300 break-words"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <div className="flex flex-col items-center gap-0.5">
                                    {resolved.structuredLines.map(
                                      (line: StructuredLine, i: number) => {
                                        const lineHighlighted =
                                          isBest && fragment === line.value;
                                        return (
                                          <div
                                            key={i}
                                            className={`flex items-baseline gap-1 ${lineHighlighted ? "text-blue-600 dark:text-blue-400" : ""}`}
                                          >
                                            <span>{line.value}</span>
                                            {lineHighlighted && (
                                              <span className="text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
                                                ★
                                              </span>
                                            )}
                                            {line.label && (
                                              <span
                                                className={`text-[11px] ${lineHighlighted ? "text-blue-400/70 dark:text-blue-400/60" : "text-zinc-400 dark:text-zinc-500"}`}
                                              >
                                                ({line.label})
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                    {resolved.subValue && (
                                      <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed font-normal text-zinc-400 dark:text-zinc-500">
                                        {resolved.subValue}
                                      </p>
                                    )}
                                  </div>
                                  {resolved.note && <FieldNotePopover note={resolved.note} />}
                                </div>
                              </td>
                            );
                          }

                          // --- Plain string rendering ---
                          const displayVal = resolved.displayValue;
                          const usePartialHighlight =
                            isBest &&
                            fragment !== undefined &&
                            displayVal !== undefined &&
                            displayVal.includes(fragment) &&
                            displayVal !== fragment;

                          let primaryNode: React.ReactNode;
                          if (displayVal === undefined) {
                            primaryNode = valueCellLabels.missing;
                          } else if (usePartialHighlight && fragment) {
                            const idx = displayVal.indexOf(fragment);
                            const before = displayVal.slice(0, idx);
                            const after = displayVal.slice(
                              idx + fragment.length
                            );
                            primaryNode = (
                              <>
                                {before}
                                <span className="text-blue-600 dark:text-blue-400">
                                  {fragment}
                                </span>
                                <span className="ml-0.5 text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
                                  ★
                                </span>
                                {after}
                              </>
                            );
                          } else {
                            primaryNode = (
                              <>
                                {displayVal}
                                {isBest && (
                                  <span className="ml-1.5 text-[10px] font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
                                    ★
                                  </span>
                                )}
                              </>
                            );
                          }

                          return (
                            <td
                              key={lens.id}
                              className={`px-3 py-3 text-center font-medium tabular-nums break-words ${
                                isBest && !usePartialHighlight
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <div>
                                  <span className="whitespace-pre-line">
                                    {primaryNode}
                                  </span>
                                  {resolved.subValue && (
                                    <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed font-normal text-zinc-400 dark:text-zinc-500">
                                      {resolved.subValue}
                                    </p>
                                  )}
                                </div>
                                {resolved.note && <FieldNotePopover note={resolved.note} />}
                              </div>
                            </td>
                          );
                        }

                        // text row
                        return (
                          <td
                            key={lens.id}
                            className="px-3 py-3 text-center text-zinc-700 dark:text-zinc-300 break-words"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div>
                                <span className="whitespace-pre-line">
                                  {resolved.displayValue ?? valueCellLabels.missing}
                                </span>
                                {resolved.subValue && (
                                  <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                                    {resolved.subValue}
                                  </p>
                                )}
                              </div>
                              {resolved.note && <FieldNotePopover note={resolved.note} />}
                            </div>
                          </td>
                        );
                      })}
                      {/* Empty slot cells for unfilled columns */}
                      {Array.from({ length: emptySlotCount }).map((_, i) => (
                        <td
                          key={`empty-cell-${i}`}
                          className="border-l border-zinc-100 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
                        />
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>

        {orderedLenses.length > 0 && <tfoot>
          <LinksRow
            orderedLenses={orderedLenses}
            emptySlotCount={emptySlotCount}
            lensFields={lensFields}
            url={(lens) => getLensUrl(lens, locale)}
            officialSiteLabel={t("officialSite")}
            reportIssueLabel={t("reportIssue")}
            tBrand={tBrand}
            border="top"
          />
        </tfoot>}
      </table>
    </div>
    </>
  );
}
