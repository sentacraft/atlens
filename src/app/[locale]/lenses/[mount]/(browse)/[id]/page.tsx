import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Flag } from "lucide-react";
import { routing } from "@/i18n/routing";
import { getLensesByMount, getLensUrl } from "@/lib/lens";
import { urlSegmentToMount } from "@/lib/mount";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens-image";
import { buildSpecGroups, resolveSpecGroups } from "@/lib/lens-spec-groups";
import type { ResolvedSpecRow, StructuredLine } from "@/lib/lens-spec-groups";
import { ExternalLink } from "@/components/ui/external-link";
import { Link } from "@/i18n/navigation";
import AddToCompareButton from "@/components/AddToCompareButton";
import BackToTopButton from "@/components/BackToTopButton";
import ShareFAB from "@/components/ShareFAB";
import { ShareButton } from "@/components/share/ShareButton";
import FeedbackTrigger from "@/components/FeedbackTrigger";
import { ACTION_OUTLINE_CLS } from "@/lib/ui-tokens";
import { BoolCell } from "@/components/ui/bool-cell";
import { FieldNotePopover } from "@/components/ui/field-note-popover";
import { buildAlternates } from "@/lib/seo";
import { pickPriceEntry, formatPriceForReport } from "@/lib/lens-pricing";
import { lensSubtitleLine } from "@/lib/lens.format";
import { PriceSection } from "@/components/PriceSection";

type Params = Promise<{ locale: string; mount: string; id: string }>;

// Pre-render every (locale × mount × lens id) combination at build time so the
// detail page is served as a static HTML asset with zero per-request CPU cost.
// Lens IDs are language-agnostic — fetching the catalog in the default locale
// to enumerate IDs is sufficient.
export function generateStaticParams() {
  const xLensIds = getLensesByMount("X", routing.defaultLocale).map((l) => l.id);
  const gLensIds = getLensesByMount("G", routing.defaultLocale).map((l) => l.id);

  return routing.locales.flatMap((locale) => [
    ...xLensIds.map((id) => ({ locale, mount: "x", id })),
    ...gLensIds.map((id) => ({ locale, mount: "gfx", id })),
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, mount, id } = await params;
  const t = await getTranslations("LensDetail");
  const lenses = getLensesByMount(urlSegmentToMount(mount) ?? "X", locale);
  const lens = lenses.find((l) => l.id === id);
  if (!lens) {
    return { title: t("notFoundTitle") };
  }
  return {
    title: lens.model,
    openGraph: { title: `${lens.model} | X-Glass` },
    alternates: buildAlternates(locale, `lenses/${mount}/${id}`),
  };
}

function StructuredLines({ lines }: { lines: StructuredLine[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {lines.map((line, i) => (
        <div key={i} className="flex items-baseline gap-1">
          <span>{line.value}</span>
          {line.label && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              ({line.label})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function renderRowValue(
  resolved: ResolvedSpecRow,
  labels: { yes: string; no: string; partial: string; unknown: string; missing: string },
) {
  if (resolved.kind === "bool") {
    return (
      <div>
        <BoolCell
          value={resolved.boolValue}
          yes={labels.yes}
          no={labels.no}
          partial={labels.partial}
          unknown={labels.unknown}
        />
        {resolved.subValue && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            {resolved.subValue}
          </p>
        )}
      </div>
    );
  }
  if (resolved.kind === "numeric" && resolved.structuredLines && resolved.structuredLines.length > 0) {
    return (
      <div>
        <StructuredLines lines={resolved.structuredLines} />
        {resolved.subValue && (
          <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            {resolved.subValue}
          </p>
        )}
      </div>
    );
  }
  // resolved is ResolvedTextRow here
  return (
    <div>
      <span className="whitespace-pre-line">{resolved.displayValue ?? labels.missing}</span>
      {resolved.subValue && (
        <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
          {resolved.subValue}
        </p>
      )}
    </div>
  );
}

export default async function LensDetailPage({ params }: { params: Params }) {
  const { id, locale, mount } = await params;
  setRequestLocale(locale);
  const lenses = getLensesByMount(urlSegmentToMount(mount) ?? "X", locale);
  const lens = lenses.find((l) => l.id === id);

  if (!lens) {
    notFound();
  }

  const t = await getTranslations("LensDetail");
  const tBrand = await getTranslations("Brands");
  const tPricing = await getTranslations("Pricing");
  const url = getLensUrl(lens, locale);

  const specGroups = buildSpecGroups({
    groupOptics: t("groupOptics"),
    groupFocus: t("groupFocus"),
    groupStabilization: t("groupStabilization"),
    groupPhysical: t("groupPhysical"),
    groupFeatures: t("groupFeatures"),
    groupRelease: t("groupRelease"),
    focalLength: t("focalLength"),
    focalLengthEquiv: t("focalLengthEquiv"),
    maxAperture: t("maxAperture"),
    minAperture: t("minAperture"),
    maxTStop: t("maxTStop"),
    minTStop: t("minTStop"),
    angleOfView: t("angleOfView"),
    angleOfViewEstNote: t("angleOfViewEstNote"),
    apertureBladeCount: t("apertureBladeCount"),
    lensConfiguration: t("lensConfiguration"),
    af: t("af"),
    focusMotor: t("focusMotor"),
    internalFocusing: t("internalFocusing"),
    minFocusDist: t("minFocusDist"),
    maxMagnification: t("maxMagnification"),
    ois: t("ois"),
    weight: t("weight"),
    dimensions: t("dimensions"),
    filterSize: t("filterSize"),
    lensMaterial: t("lensMaterial"),
    wr: t("wr"),
    apertureRing: t("apertureRing"),
    powerZoom: t("powerZoom"),
    specialtyTags: t("specialtyTags"),
    releaseYear: t("releaseYear"),
    releaseYearLabelNote: t("releaseYearLabelNote"),
    accessories: t("accessories"),
    yes: t("yes"),
    no: t("no"),
    partial: t("partial"),
    retracted: t("lengthRetracted"),
    wide: t("lengthWide"),
    tele: t("lengthTele"),
    lc: {
      groups: t("lcGroups"),
      elements: t("lcElements"),
      aspherical: t("lcAspherical"),
      ed: t("lcEd"),
      superEd: t("lcSuperEd"),
      sld: t("lcSld"),
      fld: t("lcFld"),
      highRefractive: t("lcHighRefractive"),
      incl: t("lcIncl"),
    },
    tags: {
      cine: t("tagCine"),
      anamorphic: t("tagAnamorphic"),
      tilt: t("tagTilt"),
      shift: t("tagShift"),
      macro: t("tagMacro"),
      ultra_macro: t("tagUltraMacro"),
      fisheye: t("tagFisheye"),
      probe: t("tagProbe"),
    },
    motorClass: {
      linear: t("motorLinear"),
      stepping: t("motorStepping"),
      other: t("motorOther"),
    },
  });

  // Per-view suppression: hide rows where this lens has no data.
  const valueCellLabels = {
    yes: t("yes"),
    no: t("no"),
    partial: t("partial"),
    unknown: t("unknown"),
    missing: t("missing"),
  };

  // Resolve all row values once. This is the single source of truth for both
  // the rendered spec table and the Report Dialog's field list.
  const resolvedGroups = resolveSpecGroups(specGroups, lens, valueCellLabels);

  // Field options for the Report Dialog — taken directly from resolved values,
  // identical to what is rendered in the spec table below.
  const mediaGroupLabel = t("fieldGroupMedia");
  const priceSelection = pickPriceEntry(lens.pricing, locale);
  const reportableFields = [
    ...resolvedGroups.flatMap((group) =>
      group.rows.map((row) => ({ label: row.label, currentValue: row.plainText, group: group.label }))
    ),
    ...(priceSelection
      ? [{ label: tPricing("fieldLabel"), currentValue: formatPriceForReport(priceSelection, locale, tPricing), group: tPricing("groupLabel") }]
      : []),
    ...(url ? [{ label: t("fieldOfficialLink"), currentValue: url, group: mediaGroupLabel }] : []),
    { label: t("fieldLensImage"), currentValue: getLensImageUrl(lens.id), group: mediaGroupLabel, hideCurrentValue: true },
  ];

  return (
    <>
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-[max(6rem,calc(var(--compare-bar-height,0px)+2rem))] flex flex-col gap-8">
      {/* Header: image + key info side by side */}
      <div className="flex flex-col sm:flex-row gap-8">
        {/* Image — 256px so the 1:1 card height still exceeds the info
            column, letting mt-auto on the buttons row push them cleanly to
            the image's bottom edge. */}
        <div className="w-full max-w-64 mx-auto sm:mx-0 shrink-0 sm:w-64">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={getLensImageUrl(lens.id)}
                alt={lens.model}
                fill
                sizes="256px"
                style={lensImageStyle}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Info: title → price → actions.
            @container so the actions row below can use container queries
            to hide secondary button text when the info column gets narrow
            (small desktop / portrait tablet), avoiding the 4-button row
            wrapping into 2 rows. */}
        <div className="@container flex-1 flex flex-col gap-5">
          {/* Title */}
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {lensSubtitleLine(tBrand(lens.brand), lens.series)}
            </p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1 font-heading">
              {lens.model}
            </h1>
          </div>

          {/* Price */}
          <PriceSection lens={lens} />

          {/* Actions — mt-auto pushes them to the bottom of the stretched
              info column so the row aligns with the image card's bottom. */}
          <div className="flex flex-wrap gap-3 mt-auto">
            <AddToCompareButton lensId={lens.id} />
            {url ? (
              <ExternalLink href={url} className={ACTION_OUTLINE_CLS}>
                {t("officialSite")}
              </ExternalLink>
            ) : (
              <span className={ACTION_OUTLINE_CLS + " cursor-not-allowed opacity-40"}>
                {t("officialSite")}
              </span>
            )}
            <ShareButton lenses={[lens]} triggerClassName={ACTION_OUTLINE_CLS} />
            <FeedbackTrigger
              type="data_issue"
              context={{ lensId: lens.id, lensModel: lens.model, lensBrand: tBrand(lens.brand) }}
              fields={reportableFields}
              className={ACTION_OUTLINE_CLS}
            >
              <Flag size={14} />
              <span className="max-xs:hidden @max-md:hidden">{t("reportIssue")}</span>
            </FeedbackTrigger>
          </div>
        </div>
      </div>

      {/* Grouped spec table — full-width section below the header */}
      <div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {resolvedGroups.map((group, groupIdx) => (
              <div
                key={group.label}
                className={groupIdx > 0 ? "border-t border-zinc-200 dark:border-zinc-800" : ""}
              >
                {/* Group header */}
                <div className="px-4 py-2 bg-zinc-100/80 dark:bg-zinc-800/60">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {group.label}
                  </span>
                </div>

                {/* Rows */}
                <table className="w-full text-sm">
                  <tbody>
                    {group.rows.map((resolved) => (
                      <tr
                        key={resolved.label}
                        className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-zinc-900/30 w-40 align-top">
                          <div className="flex items-center gap-1">
                            <span className="whitespace-nowrap">{resolved.label}</span>
                            {resolved.labelNote && <FieldNotePopover note={resolved.labelNote} variant={resolved.labelNoteVariant} />}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            {renderRowValue(resolved, valueCellLabels)}
                            {resolved.note && <FieldNotePopover note={resolved.note} />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 px-2 pt-4">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {t("nudgeText")}
            </p>
            <FeedbackTrigger
              type="data_issue"
              context={{ lensId: lens.id, lensModel: lens.model, lensBrand: tBrand(lens.brand) }}
              fields={reportableFields}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
            >
              <Flag size={12} />
              {t("reportIssue")}
            </FeedbackTrigger>
          </div>
      </div>
    </div>
    <BackToTopButton />
    <ShareFAB lenses={[lens]} />
    </>
  );
}
