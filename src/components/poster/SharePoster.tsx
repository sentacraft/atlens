"use client";

import type { Ref } from "react";
import { QRCodeSVG } from "qrcode.react";
import Iris from "@/components/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";
import { classifyFocusMotor } from "@/lib/lens";
import { getLensImageUrl } from "@/lib/lens-image";
import {
  filterSizeDisplay,
  dimensionsPrimaryDisplay,
  primaryApertureDisplay,
  secondaryApertureDisplay,
  specialtyTagsDisplay,
} from "@/lib/lens.format";
import type { SpecialtyTag, FieldNoteKey } from "@/lib/types";
import { PosterSection } from "./PosterSection";
import { PosterFeatureItem } from "./PosterFeatureItem";

// ── Labels ─────────────────────────────────────────────────────────

export interface PosterLabels {
  appName: string;
  siteUrl: string;
  /** Short CTA / tagline shown in the header top-right. */
  cta: string;
  /** One line per lens — shown as stacked title lines when no custom title is set. */
  comparison: string[];
  // Section titles
  sectionFocalCoverage: string;
  sectionFocus: string;
  sectionSizeWeight: string;
  sectionFeatures: string;
  sectionDetails: string;
  // Stat labels (shown below values)
  minFocusLabel: string;
  maxMagLabel: string;
  macroLabel: string;
  normalLabel: string;
  weightLabel: string;
  dimensionsLabel: string;
  filterLabel: string;
  focusMotorLabel: string;
  tStopLabel: string;
  lensConfigLabel: string;
  // Feature names
  featureWR: string;
  wrPartialSub: string;
  featureOIS: string;
  featureAF: string;
  featureApertureRing: string;
  featureInternalFocusing: string;
  // Focus motor canonical classes
  motorLinear: string;
  motorStepping: string;
  motorOther: string;
  // Sub-labels used by format functions
  wide: string;
  tele: string;
  // Specialty tags
  tagCine: string;
  tagAnamorphic: string;
  tagTilt: string;
  tagShift: string;
  tagMacro: string;
  tagUltraMacro: string;
  tagFisheye: string;
  tagProbe: string;
  // Fallback
  na: string;
}

export interface PosterCustom {
  title?: string;
  slogan?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Returns labeled wide/tele lines whenever at least one end is present.
 * Labeling single-variant cases (e.g. tele-only) is critical: without the
 * label, a zoom's "0.27x achievable only at tele" reads as "0.27x across
 * the whole range" when compared side-by-side with lenses that do carry
 * wide/tele breakdowns. Returns null only when neither end is present.
 */
function getFocusVariantLines(
  data: { variants?: { wide?: number; tele?: number } } | undefined,
  format: (v: number) => string,
  labels: { wide: string; tele: string }
): Array<{ label: string; value: string }> | null {
  const wide = data?.variants?.wide;
  const tele = data?.variants?.tele;
  if (wide === undefined && tele === undefined) return null;
  return [
    wide !== undefined ? { label: labels.wide, value: format(wide) } : null,
    tele !== undefined ? { label: labels.tele, value: format(tele) } : null,
  ].filter((v): v is { label: string; value: string } => v !== null);
}

// ── Constants ──────────────────────────────────────────────────────

const POSTER_W = 750;
const POSTER_PX = 40; // horizontal padding
const COL_GAP = 16;

// ── Helpers ────────────────────────────────────────────────────────

function gridStyle(n: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${n}, 1fr)`,
    gap: COL_GAP,
  };
}

/** Primary weight value for normalisation (use lower bound for ranges). */
function primaryWeight(w: Lens["weightG"]): number | undefined {
  if (w === undefined) return undefined;
  return Array.isArray(w) ? w[0] : w;
}

function toVariantLines<T>(
  variants: { wide?: T; tele?: T } | undefined,
  format: (v: T) => string,
  labels: { wide: string; tele: string }
): Array<{ label: string; value: string }> {
  return [
    variants?.wide !== undefined ? { label: labels.wide, value: format(variants.wide) } : null,
    variants?.tele !== undefined ? { label: labels.tele, value: format(variants.tele) } : null,
  ].filter((v): v is { label: string; value: string } => v !== null);
}

// ── Parameter-card primitives ──────────────────────────────────────
// A "parameter card" in the Focus / Size sections follows label-at-top
// layout: small eyebrow label first, then the hero value, then optional
// caption. Label-above keeps ambiguous-unit values (17cm, 67mm, 0.27x)
// self-identifying during horizontal scan across columns.

function EyebrowLabel({ children, sup }: { children: React.ReactNode; sup?: number }) {
  return (
    <span
      className="text-zinc-400 text-center"
      style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}
    >
      {children}
      {sup !== undefined && (
        <span style={{ fontSize: "0.7em", verticalAlign: "super", marginLeft: 1 }}>{sup}</span>
      )}
    </span>
  );
}

function ModeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-zinc-500"
      style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}
    >
      {children}
    </span>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-medium tabular-nums text-zinc-400 leading-tight text-center"
      style={{ fontSize: 11 }}
    >
      {children}
    </span>
  );
}

function ParamColumn({
  label,
  sup,
  children,
}: {
  label: string;
  sup?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <EyebrowLabel sup={sup}>{label}</EyebrowLabel>
      {children}
    </div>
  );
}

function HeroValueLine({
  modePrefix,
  lines,
  statSize,
}: {
  modePrefix?: string;
  lines: Array<{ label?: string; value: string }>;
  statSize: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        flexWrap: "wrap",
        columnGap: 6,
        rowGap: 2,
      }}
    >
      {modePrefix && <ModeBadge>{modePrefix}</ModeBadge>}
      {lines.map((line, j) => (
        <span key={j} style={{ display: "inline-flex", alignItems: "baseline", gap: 3 }}>
          {line.label && <ModeBadge>{line.label}</ModeBadge>}
          <span className={cn("font-semibold tabular-nums text-zinc-900 leading-tight", statSize)}>
            {line.value}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

interface SharePosterProps {
  lenses: Lens[];
  labels: PosterLabels;
  custom?: PosterCustom;
  /** Full URL of the current comparison page — used to generate the QR code. */
  shareUrl?: string;
  ref?: Ref<HTMLDivElement>;
}

export function SharePoster({ lenses, labels, custom, shareUrl, ref }: SharePosterProps) {
  const n = lenses.length;
  const titleLines: string[] = custom?.title?.trim()
    ? [custom.title.trim()]
    : labels.comparison;
  const titleFontSize = titleLines.length <= 1 ? 32 : titleLines.length === 2 ? 22 : 17;
  const slogan = custom?.slogan?.trim();

  // Hero font sizes — scale down as more lenses are added
  const focalSize = n <= 2 ? "text-5xl" : n === 3 ? "text-4xl" : "text-3xl";
  const apertureSize = n <= 2 ? "text-3xl" : "text-2xl";
  const statSize = n <= 3 ? "text-xl" : "text-lg";

  // Section label helpers
  const wideTeleLabels = { wide: labels.wide, tele: labels.tele };

  const specialtyTagLabels: Record<SpecialtyTag, string> = {
    cine: labels.tagCine,
    anamorphic: labels.tagAnamorphic,
    tilt: labels.tagTilt,
    shift: labels.tagShift,
    macro: labels.tagMacro,
    ultra_macro: labels.tagUltraMacro,
    fisheye: labels.tagFisheye,
    probe: labels.tagProbe,
  };

  // ── Feature row visibility ─────────────────────────────────────
  // A feature row is shown only when at least one lens has a defined value.
  // showInternalFocusing hidden — data quality issues, to be re-added later

  // ── Conditional Details visibility ────────────────────────────
  const focusMotorValues = lenses.map((l) => {
    const cls = classifyFocusMotor(l);
    if (!cls) return undefined;
    return cls === "linear"
      ? labels.motorLinear
      : cls === "stepping"
      ? labels.motorStepping
      : labels.motorOther;
  });
  const specialtyValues = lenses.map((l) =>
    specialtyTagsDisplay(l.specialtyTags, specialtyTagLabels)
  );

  const showFocusMotorRow = focusMotorValues.some(Boolean);
  const showSpecialtyRow = specialtyValues.some(Boolean);
  // Details section now only contains specialty tags (focus motor moved to Focus section)
  const showDetailsSection = showSpecialtyRow;

  // ── Focus section visibility ───────────────────────────────────
  const showMinFocus = lenses.some((l) => l.minFocusDistance !== undefined);
  const showMaxMag = lenses.some((l) => l.maxMagnification !== undefined);

  // ── Size & Weight visibility ───────────────────────────────────
  const weights = lenses.map((l) => primaryWeight(l.weightG));
  const maxWeightG = Math.max(0, ...weights.filter((w): w is number => w !== undefined));
  const showWeight = weights.some((w) => w !== undefined);
  const showDimensions = lenses.some(
    (l) => l.diameterMm !== undefined || l.length !== undefined
  );
  const showFilter = lenses.some((l) => l.filterMm !== undefined);

  // ── Field notes collection ─────────────────────────────────────
  // Notes with identical text for the same field are aggregated under one
  // superscript. The footnote block then lists all lens models together.
  interface CollectedNote {
    sup: number;
    lensModels: string[];
    fieldLabel: string;
    note: string;
  }
  const noteMap = new Map<string, number>(); // `${lensIndex}:${fieldKey}` → sup
  // Dedup key → index in footnotes array for aggregation
  const dedupMap = new Map<string, number>(); // `${fieldKey}::${noteText}` → footnotes index
  const footnotes: CollectedNote[] = [];
  let _supCounter = 1;

  const collectNote = (lensIndex: number, key: FieldNoteKey, fieldLabel: string) => {
    const note = lenses[lensIndex].fieldNotes?.[key];
    if (!note) return;
    const lensMapKey = `${lensIndex}:${key}`;
    if (noteMap.has(lensMapKey)) return;
    // Aggregate: if an identical note already exists for this field, reuse its sup
    const dedupKey = `${key}::${note}`;
    const existingIdx = dedupMap.get(dedupKey);
    if (existingIdx !== undefined) {
      noteMap.set(lensMapKey, footnotes[existingIdx].sup);
      footnotes[existingIdx].lensModels.push(lenses[lensIndex].model);
    } else {
      noteMap.set(lensMapKey, _supCounter);
      const idx = footnotes.length;
      footnotes.push({ sup: _supCounter, lensModels: [lenses[lensIndex].model], fieldLabel, note });
      dedupMap.set(dedupKey, idx);
      _supCounter++;
    }
  };

  // Collect in section display order, lenses left-to-right within each field.
  // Weight variance is intentionally omitted from the poster (shown on compare
  // and detail pages instead), so no weightG footnote.
  if (showMinFocus)      lenses.forEach((_, i) => collectNote(i, "minFocusDistance", labels.minFocusLabel));
  if (showMaxMag)        lenses.forEach((_, i) => collectNote(i, "maxMagnification", labels.maxMagLabel));
  if (showFilter)        lenses.forEach((_, i) => collectNote(i, "filterMm", labels.filterLabel));
  /* Features always rendered */    lenses.forEach((_, i) => collectNote(i, "ois", labels.featureOIS));
  /* Features always rendered */    lenses.forEach((_, i) => collectNote(i, "wr", labels.featureWR));
  if (showFocusMotorRow) lenses.forEach((_, i) => collectNote(i, "focusMotor", labels.focusMotorLabel));

  // Helper: look up superscript for a given lens + field (undefined if no note)
  const noteSup = (lensIndex: number, key: FieldNoteKey): number | undefined =>
    noteMap.get(`${lensIndex}:${key}`);

  // ── OIS stops helper ───────────────────────────────────────────
  const oisSub = (l: Lens) =>
    l.ois && l.oisStops !== undefined ? `${l.oisStops}-stop` : undefined;

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className="bg-white"
      style={{ width: POSTER_W }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ padding: `24px ${POSTER_PX}px 20px`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Left: brand tag → title → slogan */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
          {/* Brand tag: Iris mark + app name inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
            <Iris config={IRIS_NAV} size={14} uid="poster" />
            <span
              className="text-zinc-400"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              X-Glass
            </span>
          </div>
          {/* Title lines — one per lens, font scales with count */}
          <div style={{ marginBottom: slogan ? 8 : 0 }}>
            {titleLines.map((line, i) => (
              <div
                key={i}
                className="text-zinc-900"
                style={{ fontSize: titleFontSize, fontWeight: 600, lineHeight: 1.25 }}
              >
                {line}
              </div>
            ))}
          </div>
          {/* Slogan */}
          {slogan && (
            <div className="text-zinc-400" style={{ fontSize: 13, lineHeight: 1.4 }}>
              {slogan}
            </div>
          )}
        </div>

        {/* Right: QR code + CTA */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 8 }}>
          {/* QR code */}
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 6,
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {shareUrl ? (
              <QRCodeSVG
                value={shareUrl}
                size={64}
                level="H"
                style={{ display: "block" }}
                imageSettings={{
                  src: "/icons/icon-192-white.png",
                  width: 12,
                  height: 12,
                  excavate: true,
                }}
              />
            ) : (
              <span className="text-zinc-300" style={{ fontSize: 8, letterSpacing: 1 }}>QR</span>
            )}
          </div>
          {/* CTA + site URL */}
          <div style={{ textAlign: "right" }}>
            <div className="text-zinc-700" style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.5 }}>
              {labels.cta}
            </div>
            <div className="text-zinc-700" style={{ fontSize: 8, fontWeight: 600, marginTop: 2 }}>
              {labels.siteUrl}
            </div>
          </div>
        </div>
      </div>

      {/* separator */}
      <div className="h-px bg-zinc-200" />

      {/* ── Product Row ───────────────────────────────────────── */}
      <div style={{ padding: `16px ${POSTER_PX}px` }}>
        <div style={gridStyle(n)}>
          {lenses.map((lens, i) => {
            const imgH = n <= 2 ? 140 : 100;
            return (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
              >
                {/* Image */}
                <div
                  style={{
                    width: "100%",
                    height: imgH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/*
                    * eslint-disable-next-line @next/next/no-img-element
                    * Must use native <img> here — canvas capture libraries (html2canvas etc.)
                    * cannot handle Next.js <Image>'s wrapper divs and srcset attributes.
                    */}
                  <img
                    src={getLensImageUrl(lens.id)}
                    alt={lens.model}
                    crossOrigin="anonymous"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
                {/* Brand */}
                <div
                  className="text-zinc-400"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  {lens.brand}
                </div>
                {/* Model */}
                <div
                  className="text-zinc-900"
                  style={{
                    fontSize: n <= 3 ? 12 : 11,
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.3,
                  }}
                >
                  {lens.model}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* separator */}
      <div className="h-px bg-zinc-200" />

      {/* ── Hero Block ────────────────────────────────────────── */}
      <div style={{ padding: `20px ${POSTER_PX}px` }}>
        {/* Row 1: Focal length numbers */}
        <div style={{ ...gridStyle(n), marginBottom: 20 }}>
          {lenses.map((lens, i) => (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
            >
              <span className={cn("font-semibold tabular-nums text-zinc-900 leading-none", focalSize)}>
                {lens.focalLengthMin === lens.focalLengthMax
                  ? lens.focalLengthMin
                  : `${lens.focalLengthMin}–${lens.focalLengthMax}`}
              </span>
              <span className="text-zinc-400" style={{ fontSize: 11, letterSpacing: "0.05em" }}>mm</span>
            </div>
          ))}
        </div>

        {/* Row 2: Aperture + Weight side-by-side within each lens column */}
        <div style={gridStyle(n)}>
          {lenses.map((lens, i) => {
            // Weight variance (e.g. [340, 395] across mount variants) is
            // shown on compare/detail pages; the poster shows a single
            // representative scalar (lower bound).
            const weightScalar = primaryWeight(lens.weightG);
            return (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "center", gap: 20, alignItems: "flex-start" }}
              >
                {/* Aperture */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span className={cn("font-semibold tabular-nums text-zinc-900 leading-none", apertureSize)}>
                    {primaryApertureDisplay(lens) ?? ""}
                  </span>
                  {secondaryApertureDisplay(lens) && (
                    <span className="font-medium tabular-nums text-zinc-500 leading-none" style={{ fontSize: 11 }}>
                      {secondaryApertureDisplay(lens)}
                    </span>
                  )}
                  <span className="text-zinc-400" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Aperture
                  </span>
                </div>

                {/* Weight */}
                {showWeight && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    {weightScalar !== undefined ? (
                      <>
                        <span className={cn("font-semibold tabular-nums text-zinc-900 leading-none", apertureSize)}>
                          {weightScalar}g
                        </span>
                        <span className="text-zinc-400" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                          {labels.weightLabel}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-300" style={{ fontSize: 9 }}>—</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Size Section ─────────────────────────────────────── */}
      {(showDimensions || showFilter) && (
        <>
          <div className="h-px bg-zinc-200" />
          <div style={{ padding: `20px ${POSTER_PX}px` }}>
            <PosterSection title={labels.sectionSizeWeight}>
              {/* Dimensions — primary scalar only; length variants (retracted/
                  wide/tele) intentionally omitted from the poster and shown on
                  compare/detail pages instead. */}
              {showDimensions && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {lenses.map((lens, i) => {
                    const primary = dimensionsPrimaryDisplay(lens.diameterMm, lens.length);
                    return (
                      <ParamColumn key={i} label={labels.dimensionsLabel}>
                        {primary ? (
                          <span className="text-base font-medium tabular-nums text-zinc-900 leading-tight text-center">
                            {primary}
                          </span>
                        ) : (
                          <span className="text-base font-medium tabular-nums text-zinc-300 leading-tight">—</span>
                        )}
                      </ParamColumn>
                    );
                  })}
                </div>
              )}

              {/* Filter size */}
              {showFilter && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {lenses.map((lens, i) => {
                    const value = filterSizeDisplay(lens.filterMm);
                    const sup = noteSup(i, "filterMm");
                    return (
                      <ParamColumn key={i} label={labels.filterLabel} sup={sup}>
                        {value ? (
                          <span className="text-base font-medium tabular-nums text-zinc-900 leading-tight text-center">
                            {value}
                          </span>
                        ) : (
                          <span className="text-base font-medium tabular-nums text-zinc-300 leading-tight">—</span>
                        )}
                      </ParamColumn>
                    );
                  })}
                </div>
              )}
            </PosterSection>
          </div>
        </>
      )}

      {/* ── Focus Section ────────────────────────────────────── */}
      {(showMinFocus || showMaxMag || showFocusMotorRow) && (
        <>
          <div className="h-px bg-zinc-200" />
          <div style={{ padding: `20px ${POSTER_PX}px` }}>
            <PosterSection title={labels.sectionFocus}>
              {/* Min focus distance — hero = shortest capability; macro/normal
                  labels are applied symmetrically when a dedicated macro mode
                  exists, so readers never wonder "if the alt is 'normal', what
                  mode is the hero in?". */}
              {showMinFocus && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {lenses.map((lens, i) => {
                    const mfd = lens.minFocusDistance;
                    const sup = noteSup(i, "minFocusDistance");
                    if (!mfd) {
                      return (
                        <ParamColumn key={i} label={labels.minFocusLabel} sup={sup}>
                          <span className={cn("font-semibold tabular-nums leading-tight text-zinc-300", statSize)}>—</span>
                        </ParamColumn>
                      );
                    }

                    const hasNormalVariants =
                      mfd.variants?.wide !== undefined || mfd.variants?.tele !== undefined;
                    const hasMacroVariants =
                      mfd.macroVariants?.wide !== undefined || mfd.macroVariants?.tele !== undefined;
                    const macroScalarShorter =
                      mfd.macroCm !== undefined && mfd.macroCm < mfd.cm;

                    // Hero = shortest capability. Prefer macroVariants, then
                    // macro scalar (strictly shorter than normal), then normal
                    // variants, then normal scalar.
                    let primary: Array<{ label?: string; value: string }>;
                    let primaryIsMacro = false;
                    if (hasMacroVariants) {
                      primary = toVariantLines(mfd.macroVariants, (v) => `${v}cm`, wideTeleLabels);
                      primaryIsMacro = true;
                    } else if (macroScalarShorter) {
                      primary = [{ value: `${mfd.macroCm}cm` }];
                      primaryIsMacro = true;
                    } else if (hasNormalVariants) {
                      primary = toVariantLines(mfd.variants, (v) => `${v}cm`, wideTeleLabels);
                    } else {
                      primary = [{ value: `${mfd.cm}cm` }];
                    }

                    // Caption = normal-mode disclosure. Only when hero is macro.
                    let caption: string | null = null;
                    if (primaryIsMacro) {
                      if (hasNormalVariants) {
                        const parts = toVariantLines(mfd.variants, (v) => `${v}cm`, wideTeleLabels)
                          .map((l) => `${l.label} ${l.value}`)
                          .join(" · ");
                        caption = `${labels.normalLabel} ${parts}`;
                      } else {
                        caption = `${labels.normalLabel} ${mfd.cm}cm`;
                      }
                    }

                    return (
                      <ParamColumn key={i} label={labels.minFocusLabel} sup={sup}>
                        <HeroValueLine
                          modePrefix={primaryIsMacro ? labels.macroLabel : undefined}
                          lines={primary}
                          statSize={statSize}
                        />
                        {caption && <Caption>{caption}</Caption>}
                      </ParamColumn>
                    );
                  })}
                </div>
              )}

              {/* Max magnification — labels every wide/tele breakdown even when
                  only one end is reachable (e.g. XF 18-135's 0.27x at tele only).
                  Without the label, a single-end value reads as "across range"
                  and invites false comparisons against zooms with full breakdowns. */}
              {showMaxMag && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {lenses.map((lens, i) => {
                    const sup = noteSup(i, "maxMagnification");
                    const mag = lens.maxMagnification;
                    if (!mag) {
                      return (
                        <ParamColumn key={i} label={labels.maxMagLabel} sup={sup}>
                          <span className={cn("font-semibold tabular-nums leading-tight text-zinc-300", statSize)}>—</span>
                        </ParamColumn>
                      );
                    }
                    const lines = getFocusVariantLines(mag, (v) => `${v}x`, wideTeleLabels) ?? [
                      { label: undefined as string | undefined, value: `${mag.value}x` },
                    ];
                    return (
                      <ParamColumn key={i} label={labels.maxMagLabel} sup={sup}>
                        <HeroValueLine lines={lines} statSize={statSize} />
                      </ParamColumn>
                    );
                  })}
                </div>
              )}

              {/* Focus motor */}
              {showFocusMotorRow && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {focusMotorValues.map((val, i) => (
                    <ParamColumn key={i} label={labels.focusMotorLabel} sup={noteSup(i, "focusMotor")}>
                      {val ? (
                        <span className="text-sm font-medium tabular-nums text-zinc-900 leading-tight text-center">
                          {val}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-zinc-300 leading-tight">—</span>
                      )}
                    </ParamColumn>
                  ))}
                </div>
              )}

            </PosterSection>
          </div>
        </>
      )}

      {/* ── Features Section ──────────────────────────────────── */}
      <>
        <div className="h-px bg-zinc-200" />
        <div style={{ padding: `20px ${POSTER_PX}px` }}>
          <PosterSection title={labels.sectionFeatures}>
            <div style={gridStyle(n)}>
              {lenses.map((lens, i) => (
                // Outer div centers the block within the grid cell (matching PosterStatBlock alignment).
                // Inner div stays left-aligned so icon + text baseline stays consistent.
                <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <PosterFeatureItem
                    present={lens.wr}
                    label={labels.featureWR}
                    sub={lens.wr === "partial" ? labels.wrPartialSub : undefined}
                    sup={noteSup(i, "wr")}
                    icon={FEATURE_ICONS.wr}
                  />
                  <PosterFeatureItem
                    present={lens.ois}
                    label={labels.featureOIS}
                    sub={oisSub(lens)}
                    sup={noteSup(i, "ois")}
                    icon={FEATURE_ICONS.ois}
                  />
                  <PosterFeatureItem present={lens.af} label={labels.featureAF} icon={FEATURE_ICONS.af} />
                  <PosterFeatureItem present={lens.apertureRing} label={labels.featureApertureRing} icon={FEATURE_ICONS.apertureRing} />
                  </div>
                </div>
              ))}
            </div>
          </PosterSection>
        </div>
      </>

      {/* ── Details Section (specialty tags only, rarely shown) ── */}
      {showDetailsSection && (
        <>
          <div className="h-px bg-zinc-200" />
          <div style={{ padding: `20px ${POSTER_PX}px` }}>
            <PosterSection title={labels.sectionDetails}>
              {showSpecialtyRow && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {specialtyValues.map((val, i) => (
                    <ParamColumn key={i} label="Type">
                      {val ? (
                        <span className="text-sm font-medium text-zinc-900 leading-tight text-center">
                          {val}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-zinc-300 leading-tight">—</span>
                      )}
                    </ParamColumn>
                  ))}
                </div>
              )}
            </PosterSection>
          </div>
        </>
      )}

      {/* ── Footnotes ─────────────────────────────────────────── */}
      {footnotes.length > 0 && (
        <>
          <div className="h-px bg-zinc-100" />
          <div style={{ padding: `10px ${POSTER_PX}px`, display: "flex", flexDirection: "column", gap: 4 }}>
            {footnotes.map((fn) => (
              <div key={fn.sup} style={{ display: "flex", gap: 5, alignItems: "flex-start" }}>
                <span className="text-zinc-400" style={{ fontSize: 7, lineHeight: 1.6, flexShrink: 0, fontWeight: 600 }}>
                  {fn.sup}
                </span>
                <span className="text-zinc-400" style={{ fontSize: 8, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600 }}>{fn.lensModels.join(", ")}</span>
                  {" · "}
                  <span>{fn.fieldLabel}</span>
                  {": "}
                  {fn.note}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
