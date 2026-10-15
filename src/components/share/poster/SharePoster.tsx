"use client";

import type { Ref } from "react";
import { QRCodeSVG } from "qrcode.react";
import Iris from "@/components/iris/Iris";
import { IRIS_NAV } from "@/config/iris-config";
import { FEATURE_ICONS } from "@/lib/feature-icons";
import type { Lens } from "@/lib/types";
import { Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";
import { classifyFocusMotor, leadingValue, type FocusMotorClass } from "@/lib/lens/lens";
import { SPEC_NA } from "@/lib/types";
import { pickPriceEntry, formatPrice, sampledDate, type PricingTranslator } from "@/lib/lens/pricing";
import { getLensImageUrl } from "@/lib/lens/image";
import {
  filterSizeDisplay,
  dimensionsPrimaryDisplay,
  primaryApertureDisplay,
  secondaryApertureDisplay,
  mfdHeroValue,
  mfdHeroQualifier,
  mfdStructuredLines,
} from "@/lib/lens/format";
import { deriveSpecialty } from "@/lib/lens/specialty";
import type { OpticalTrait, FieldNoteKey } from "@/lib/types";
import { PosterSection } from "./PosterSection";
import { PosterFeatureItem } from "./PosterFeatureItem";

export interface PosterLabels {
  appName: string;
  siteUrl: string;
  brandTagline: string;
  cta: string;
  comparison: string[];
  sectionFocalCoverage: string;
  sectionFocus: string;
  sectionSizeWeight: string;
  sectionFeatures: string;
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
  featureWR: string;
  wrPartialSub: string;
  featureOIS: string;
  featureAF: string;
  featureApertureRing: string;
  featurePowerZoom: string;
  featureInternalZoom: string;
  motorLinear: string;
  motorStepping: string;
  motorDc: string;
  motorOther: string;
  wide: string;
  tele: string;
  tagCine: string;
  tagAnamorphic: string;
  tagTilt: string;
  tagShift: string;
  tagMacro: string;
  tagFisheye: string;
  tagProbe: string;
  priceLabel: string;
  usedBadge: string;
  pricing: PricingTranslator;
  disclaimerWarn: string;
  na: string;
  locale: string;
}

export interface PosterCustom {
  title?: string;
  slogan?: string;
}

const POSTER_W = 750;
const POSTER_PX = 40; // horizontal padding
const COL_GAP = 16;

function gridStyle(n: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${n}, 1fr)`,
    gap: COL_GAP,
  };
}

function hasVariantValue<T>(variants: { wide?: T; tele?: T } | undefined): boolean {
  return variants?.wide !== undefined || variants?.tele !== undefined;
}

// Single-variant values keep their label: a tele-only 0.27x must not read as the whole range.
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

interface SharePosterProps {
  lenses: Lens[];
  labels: PosterLabels;
  custom?: PosterCustom;
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

  const focalSize = n <= 2 ? "text-5xl" : n === 3 ? "text-4xl" : "text-3xl";
  const apertureSize = n <= 2 ? "text-3xl" : "text-2xl";
  const statSize = n <= 3 ? "text-xl" : "text-lg";

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
  const showFocusMotorRow = focusMotorValues.some(Boolean);

  const showMinFocus = lenses.some((l) => l.minFocusDistance !== undefined);
  const showMaxMag = lenses.some((l) => l.maxMagnification !== undefined);

  const priceSelections = lenses.map((l) => pickPriceEntry(l.pricing, labels.locale));
  const showPrice = priceSelections.some((s) => s !== null);

  const weights = lenses.map((l) => leadingValue(l.weightG));
  const showWeight = weights.some((w) => w !== undefined);
  const showDimensions = lenses.some(
    (l) => l.diameterMm !== undefined || l.length !== undefined
  );
  const showFilter = lenses.some((l) => l.filterMm !== undefined);

  const showPowerZoom = lenses.some((l) => l.powerZoom !== SPEC_NA);
  const showInternalZoom = lenses.some((l) => l.internalZoom !== SPEC_NA);

  interface CollectedNote {
    sup: number;
    lensModels: string[];
    fieldLabel: string;
    note: string;
  }
  const noteMap = new Map<string, number>(); // `${lensIndex}:${fieldKey}` → sup
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

  // No weightG footnote: weight variance is not shown on the poster.
  if (showMinFocus) {
    lenses.forEach((_, i) => collectNote(i, "minFocusDistance", labels.minFocusLabel));
  }
  if (showMaxMag) {
    lenses.forEach((_, i) => collectNote(i, "maxMagnification", labels.maxMagLabel));
  }
  if (showFilter) {
    lenses.forEach((_, i) => collectNote(i, "filterMm", labels.filterLabel));
  }
  lenses.forEach((_, i) => collectNote(i, "ois", labels.featureOIS));
  lenses.forEach((_, i) => collectNote(i, "wr", labels.featureWR));
  if (showInternalZoom) {
    lenses.forEach((_, i) => collectNote(i, "internalZoom", labels.featureInternalZoom));
  }
  if (showFocusMotorRow) {
    lenses.forEach((_, i) => collectNote(i, "focusMotor", labels.focusMotorLabel));
  }

  const noteSup = (lensIndex: number, key: FieldNoteKey): number | undefined =>
    noteMap.get(`${lensIndex}:${key}`);

  const oisSub = (l: Lens) =>
    l.ois && l.oisStops !== undefined ? `${l.oisStops}-stop` : undefined;

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className="bg-white"
      style={{ width: POSTER_W }}
    >
      <div style={{ padding: `28px ${POSTER_PX}px 24px` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Iris config={IRIS_NAV} size={40} uid="poster" />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  className="text-zinc-700"
                  style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}
                >
                  Atlens
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

      <div className="h-px bg-zinc-200" />

      <div style={{ padding: `16px ${POSTER_PX}px` }}>
        <div style={gridStyle(n)}>
          {lenses.map((lens, i) => {
            const imgH = n <= 2 ? 140 : 100;
            return (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: imgH,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Native img: canvas capture cannot handle next/image srcset. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getLensImageUrl(lens.id)}
                    alt={lens.model}
                    crossOrigin="anonymous"
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                </div>
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
                {(() => {
                  const { isCine, opticalTraits } = deriveSpecialty(lens);
                  const tags: string[] = [];
                  if (isCine) {
                    tags.push(specialtyTagLabels.cine);
                  }
                  for (const trait of opticalTraits) {
                    tags.push(specialtyTagLabels[trait]);
                  }
                  if (tags.length === 0) {
                    return null;
                  }
                  return (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-zinc-700"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            border: "1px solid #d4d4d8",
                            borderRadius: 6,
                            padding: "1px 6px",
                            fontSize: 10,
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            lineHeight: 1.4,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-zinc-200" />

      <div style={{ padding: `20px ${POSTER_PX}px` }}>
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
              const priceDisplay = formatPrice(labels.pricing, sel.entry.price, sel.entry.currency);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span data-redact-hook="price" className={cn("font-semibold tabular-nums text-zinc-700 leading-none", statSize)}>
                    {priceDisplay}
                  </span>
                  <span data-redact-hook="priceSource" className="tabular-nums text-zinc-400 leading-tight text-center" style={{ fontSize: 9, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sel.entry.source}
                  </span>
                  <span className="tabular-nums text-zinc-400 leading-tight" style={{ fontSize: 9 }}>
                    {labels.pricing("sampledAt", { date: sampledDate(sel.entry.sampledAt) })}
                  </span>
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
                  {showPowerZoom && (
                    <PosterFeatureItem present={lens.powerZoom === true} label={labels.featurePowerZoom} icon={FEATURE_ICONS.powerZoom} />
                  )}
                  {showInternalZoom && (
                    <PosterFeatureItem
                      present={lens.internalZoom === true}
                      label={labels.featureInternalZoom}
                      sup={noteSup(i, "internalZoom")}
                      icon={FEATURE_ICONS.internalZoom}
                    />
                  )}
                  </div>
                </div>
              ))}
            </div>
          </PosterSection>
        </div>
      </>

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
