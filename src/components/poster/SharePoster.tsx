"use client";

import type { Ref } from "react";
import { QRCodeSVG } from "qrcode.react";
import Iris from "@/components/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import type { Lens } from "@/lib/types";
import { Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { classifyFocusMotor, type FocusMotorClass } from "@/lib/lens";
import { pickPriceEntry, formatPrice, formatSampledAt } from "@/lib/lens-pricing";
import { getLensImageUrl } from "@/lib/lens-image";
import {
  filterSizeDisplay,
  dimensionsPrimaryDisplay,
  primaryApertureDisplay,
  secondaryApertureDisplay,
  mfdHeroValue,
  mfdHeroQualifier,
  mfdStructuredLines,
} from "@/lib/lens.format";
import { deriveSpecialty } from "@/lib/lens-specialty";
import type { OpticalTrait, FieldNoteKey } from "@/lib/types";
import { PosterSection } from "./PosterSection";
import { PosterFeatureItem } from "./PosterFeatureItem";

// ── Labels ─────────────────────────────────────────────────────────

export interface PosterLabels {
  appName: string;
  siteUrl: string;
  /** Brand tagline shown directly under the wordmark. */
  brandTagline: string;
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
  motorDc: string;
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
  tagFisheye: string;
  tagProbe: string;
  // Pricing
  priceLabel: string;
  usedBadge: string;
  /** CNY display template, e.g. "{value} Yuan" or "¥{value}". {value} is replaced with the formatted number. */
  cnyAmount: string;
  /** Sampled-date template, e.g. "Sampled {date}". */
  sampledAt: string;
  /** Short warn label rendered under each price, e.g. "Indicative price". */
  disclaimerWarn: string;
  // Fallback
  na: string;
  // Locale hint for formatting
  locale: string;
}

export interface PosterCustom {
  title?: string;
  slogan?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

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
  if (w === undefined) {
    return undefined;
  }
  return Array.isArray(w) ? w[0] : w;
}

function hasVariantValue<T>(variants: { wide?: T; tele?: T } | undefined): boolean {
  return variants?.wide !== undefined || variants?.tele !== undefined;
}

/**
 * Returns labeled wide/tele lines whenever at least one end is present.
 * Labeling single-variant cases (e.g. tele-only) is critical: without the
 * label, a zoom's "0.27x achievable only at tele" reads as "0.27x across
 * the whole range" when compared side-by-side with lenses that do carry
 * wide/tele breakdowns.
 */
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

function HeroSingleValue({
  value,
  qualifier,
  statSize,
}: {
  value: string;
  qualifier?: string;
  statSize: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
      <span
        className={cn("font-semibold tabular-nums text-zinc-900 leading-tight", statSize)}
        style={{ whiteSpace: "nowrap" }}
      >
        {value}
      </span>
      {qualifier && (
        <span
          className="text-zinc-400"
          style={{ fontSize: 9, fontWeight: 500, whiteSpace: "nowrap" }}
        >
          ({qualifier})
        </span>
      )}
    </div>
  );
}

function VariantCaption({
  lines,
}: {
  lines: Array<{ label: string; value: string }>;
}) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <span
      className="font-medium tabular-nums text-zinc-400 leading-tight text-center"
      style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}
    >
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: "0 3px" }}>·</span>}
          <span style={{ fontSize: 9, fontWeight: 600 }}>{line.label}</span>
          {" "}
          {line.value}
        </span>
      ))}
    </span>
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
  const slogan = custom?.slogan?.trim();
  const titleFontSize = titleLines.length <= 1 ? (slogan ? 28 : 32) : titleLines.length === 2 ? 22 : 17;

  // Hero font sizes — scale down as more lenses are added
  const focalSize = n <= 2 ? "text-5xl" : n === 3 ? "text-4xl" : "text-3xl";
  const apertureSize = n <= 2 ? "text-3xl" : "text-2xl";
  const statSize = n <= 3 ? "text-xl" : "text-lg";

  // Section label helpers
  const wideTeleLabels = { wide: labels.wide, tele: labels.tele };

  const specialtyTagLabels: Record<OpticalTrait | "cine", string> = {
    cine: labels.tagCine,
    anamorphic: labels.tagAnamorphic,
    tilt: labels.tagTilt,
    shift: labels.tagShift,
    macro: labels.tagMacro,
    fisheye: labels.tagFisheye,
    probe: labels.tagProbe,
  };

  // ── Feature row visibility ─────────────────────────────────────
  // A feature row is shown only when at least one lens has a defined value.
  // showInternalFocusing hidden — data quality issues, to be re-added later

  // ── Conditional Details visibility ────────────────────────────
  const focusMotorClassLabel: Record<FocusMotorClass, string> = {
    linear: labels.motorLinear,
    stepping: labels.motorStepping,
    dc: labels.motorDc,
    other: labels.motorOther,
  };
  const focusMotorValues = lenses.map((l) => {
    const cls = classifyFocusMotor(l);
    return cls ? focusMotorClassLabel[cls] : undefined;
  });
  const specialtyValues = lenses.map((l) => {
    const { isCine, opticalTraits } = deriveSpecialty(l);
    const parts: string[] = [];
    if (isCine) {
      parts.push(specialtyTagLabels.cine);
    }
    for (const trait of opticalTraits) {
      parts.push(specialtyTagLabels[trait]);
    }
    return parts.length > 0 ? parts.join(", ") : undefined;
  });

  const showFocusMotorRow = focusMotorValues.some(Boolean);
  const showSpecialtyRow = specialtyValues.some(Boolean);

  // ── Focus section visibility ───────────────────────────────────
  const showMinFocus = lenses.some((l) => l.minFocusDistance !== undefined);
  const showMaxMag = lenses.some((l) => l.maxMagnification !== undefined);

  // ── Pricing visibility ─────────────────────────────────────────
  const priceSelections = lenses.map((l) => pickPriceEntry(l.pricing, labels.locale));
  const showPrice = priceSelections.some((s) => s !== null);

  // ── Size & Weight visibility ───────────────────────────────────
  const weights = lenses.map((l) => primaryWeight(l.weightG));
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
    if (!note) {
      return;
    }
    const lensMapKey = `${lensIndex}:${key}`;
    if (noteMap.has(lensMapKey)) {
      return;
    }
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
  if (showMinFocus) {
    lenses.forEach((_, i) => collectNote(i, "minFocusDistance", labels.minFocusLabel));
  }
  if (showMaxMag) {
    lenses.forEach((_, i) => collectNote(i, "maxMagnification", labels.maxMagLabel));
  }
  if (showFilter) {
    lenses.forEach((_, i) => collectNote(i, "filterMm", labels.filterLabel));
  }
  /* Features always rendered */    lenses.forEach((_, i) => collectNote(i, "ois", labels.featureOIS));
  /* Features always rendered */    lenses.forEach((_, i) => collectNote(i, "wr", labels.featureWR));
  if (showFocusMotorRow) {
    lenses.forEach((_, i) => collectNote(i, "focusMotor", labels.focusMotorLabel));
  }

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
      <div style={{ padding: `28px ${POSTER_PX}px 24px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          {/* Left column: brand-stack on top, title+slogan below */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Iris config={IRIS_NAV} size={40} uid="poster" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  className="text-zinc-700"
                  style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}
                >
                  X-Glass
                </span>
                <span
                  className="text-zinc-400"
                  style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}
                >
                  {labels.brandTagline}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 28 }}>
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
              {slogan && (
                <div className="text-zinc-400" style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {slogan}
                </div>
              )}
            </div>
          </div>

          {/* Right column: QR + CTA */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 8 }}>
            <div
              data-redact-hook="posterQr"
              style={{
                width: 96,
                height: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {shareUrl ? (
                <QRCodeSVG
                  value={shareUrl}
                  size={96}
                  level="H"
                  style={{ display: "block" }}
                  imageSettings={{
                    src: "/icons/icon-192-white.png",
                    width: 18,
                    height: 18,
                    excavate: true,
                  }}
                />
              ) : (
                <span className="text-zinc-300" style={{ fontSize: 8, letterSpacing: 1 }}>QR</span>
              )}
            </div>
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
                  {/* Must use native img here because canvas capture cannot handle Next Image wrappers/srcset. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <span
                className={cn("font-semibold tabular-nums text-zinc-900 leading-none", focalSize)}
                style={{ whiteSpace: "nowrap" }}
              >
                {lens.focalLengthMin === lens.focalLengthMax
                  ? lens.focalLengthMin
                  : `${lens.focalLengthMin}–${lens.focalLengthMax}`}
              </span>
              <span className="text-zinc-400" style={{ fontSize: 11, letterSpacing: "0.05em" }}>mm</span>
            </div>
          ))}
        </div>

        {/* Row 2: Aperture */}
        <div style={{ ...gridStyle(n), marginBottom: 12 }}>
          {lenses.map((lens, i) => (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
            >
              <span
                className={cn("font-semibold tabular-nums text-zinc-900 leading-none", apertureSize)}
                style={{ whiteSpace: "nowrap" }}
              >
                {primaryApertureDisplay(lens) ?? ""}
              </span>
              {secondaryApertureDisplay(lens) && (
                <span
                  className="font-medium tabular-nums text-zinc-500 leading-none"
                  style={{ fontSize: 11, whiteSpace: "nowrap" }}
                >
                  {secondaryApertureDisplay(lens)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Row 3: Price column — value (+Used badge) / source · date / ⚠ warn.
            The warn line sits BELOW the value (not above) so it doesn't
            occupy the field-name slot used by other hero stats (focal,
            aperture). Each column carries its own warn line — repetition is
            intentional: every price independently needs the caveat. */}
        {showPrice && (
          <div style={{ ...gridStyle(n), marginTop: 32 }}>
            {lenses.map((lens, i) => {
              const sel = priceSelections[i];
              if (!sel) {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "center" }}>
                    <span className="text-zinc-300" style={{ fontSize: 9 }}>—</span>
                  </div>
                );
              }
              const isUsed = sel.condition === "used";
              const priceDisplay = formatPrice(
                sel.entry.price,
                sel.entry.currency,
                labels.locale,
                sel.condition,
                labels.cnyAmount,
              );
              const sampledDisplay = formatSampledAt(sel.entry.sampledAt, labels.locale);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {/* Value + Used badge */}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className={cn("font-semibold tabular-nums text-zinc-700 leading-none", statSize)}>
                      {priceDisplay}
                    </span>
                    {isUsed && (
                      <span className="rounded bg-zinc-200 px-1 py-px text-zinc-500" style={{ fontSize: 8, fontWeight: 500 }}>
                        {labels.usedBadge}
                      </span>
                    )}
                  </span>
                  {/* Caption row 1: source */}
                  <span data-redact-hook="priceSource" className="tabular-nums text-zinc-400 leading-tight text-center" style={{ fontSize: 9, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sel.entry.source}
                  </span>
                  {/* Caption row 2: sampled date */}
                  <span className="tabular-nums text-zinc-400 leading-tight" style={{ fontSize: 9 }}>
                    {labels.sampledAt.replace("{date}", sampledDisplay)}
                  </span>
                  {/* Caption row 3: ⚠ warn (amber, slightly bolder) */}
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d97706", fontSize: 9, fontWeight: 600 }}>
                    <TriangleAlert size={9} />
                    {labels.disclaimerWarn}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Size Section ─────────────────────────────────────── */}
      {(showWeight || showDimensions || showFilter) && (
        <>
          <div className="h-px bg-zinc-200" />
          <div style={{ padding: `20px ${POSTER_PX}px` }}>
            <PosterSection title={labels.sectionSizeWeight}>
              {showWeight && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {weights.map((w, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <Weight size={11} className="text-zinc-400" />
                      {w !== undefined ? (
                        <span
                          className="text-base font-medium tabular-nums text-zinc-900 leading-tight text-center"
                          style={{ whiteSpace: "nowrap" }}
                        >
                          {w}g
                        </span>
                      ) : (
                        <span className="text-base font-medium tabular-nums text-zinc-300 leading-tight">—</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {showDimensions && (
                <div style={{ ...gridStyle(n), alignItems: "flex-start" }}>
                  {lenses.map((lens, i) => {
                    const primary = dimensionsPrimaryDisplay(lens.diameterMm, lens.length);
                    return (
                      <ParamColumn key={i} label={labels.dimensionsLabel}>
                        {primary ? (
                          <span
                            className="text-base font-medium tabular-nums text-zinc-900 leading-tight text-center"
                            style={{ whiteSpace: "nowrap" }}
                          >
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
                          <span
                            className="text-base font-medium tabular-nums text-zinc-900 leading-tight text-center"
                            style={{ whiteSpace: "nowrap" }}
                          >
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
            <PosterSection title={labels.sectionFocus} className="gap-6">
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

                    const hero = mfdHeroValue(mfd)!;
                    const qualifier = mfdHeroQualifier(mfd, wideTeleLabels);
                    const lines = mfdStructuredLines(mfd, wideTeleLabels);

                    return (
                      <ParamColumn key={i} label={labels.minFocusLabel} sup={sup}>
                        <HeroSingleValue
                          value={hero}
                          qualifier={qualifier}
                          statSize={statSize}
                        />
                        {lines && lines.length > 1 && <VariantCaption lines={lines} />}
                      </ParamColumn>
                    );
                  })}
                </div>
              )}

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

                    const hasVariants = hasVariantValue(mag.variants);
                    let heroQualifier: string | undefined;
                    let captionLines: Array<{ label: string; value: string }> = [];

                    if (hasVariants) {
                      const wv = mag.variants!.wide;
                      const tv = mag.variants!.tele;
                      if (wv !== undefined && tv !== undefined) {
                        heroQualifier = wv >= tv ? labels.wide : labels.tele;
                      } else {
                        heroQualifier = wv !== undefined ? labels.wide : labels.tele;
                      }
                      captionLines = toVariantLines(mag.variants, (v) => `${v}x`, wideTeleLabels);
                    }

                    const showCaption = captionLines.length > 1;

                    return (
                      <ParamColumn key={i} label={labels.maxMagLabel} sup={sup}>
                        <HeroSingleValue
                          value={`${mag.value}x`}
                          qualifier={heroQualifier}
                          statSize={statSize}
                        />
                        {showCaption && <VariantCaption lines={captionLines} />}
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
                  {showSpecialtyRow && (
                    <>
                      <div className="h-px bg-zinc-100" style={{ marginTop: 3, marginBottom: 3 }} />
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span className="text-zinc-400" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {labels.sectionDetails}
                        </span>
                        {specialtyValues[i] ? (
                          <span className="text-xs font-medium text-zinc-900 leading-tight text-center">
                            {specialtyValues[i]}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-zinc-300 leading-tight">—</span>
                        )}
                      </div>
                    </>
                  )}
                  </div>
                </div>
              ))}
            </div>
          </PosterSection>
        </div>
      </>

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
