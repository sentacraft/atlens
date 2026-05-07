import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Flag } from "lucide-react";
import { allLenses, getLensUrl } from "@/lib/lens";
import { getShopLinks } from "@/lib/brand-shops";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens-image";
import { buildSpecGroups, resolveSpecGroups } from "@/lib/lens-spec-groups";
import type { ResolvedSpecRow, StructuredLine } from "@/lib/lens-spec-groups";
import { ExternalLink } from "@/components/ui/external-link";
import { Link } from "@/i18n/navigation";
import AddToCompareButton from "@/components/AddToCompareButton";
import BackButton from "@/components/BackButton";
import BackToTopButton from "@/components/BackToTopButton";
import { ShareButton } from "@/components/ShareButton";
import FeedbackTrigger from "@/components/FeedbackTrigger";
import { ACTION_OUTLINE_CLS } from "@/lib/ui-tokens";
import { BoolCell } from "@/components/ui/bool-cell";
import { FieldNotePopover } from "@/components/ui/field-note-popover";
import { buildAlternates } from "@/lib/seo";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("LensDetail");
  const lens = allLenses.find((l) => l.id === id);
  if (!lens) {
    return { title: t("notFoundTitle") };
  }
  return {
    title: lens.model,
    openGraph: { title: `${lens.model} | X-Glass` },
    alternates: buildAlternates(locale, `lenses/${id}`),
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
  const { id, locale } = await params;
  const lens = allLenses.find((l) => l.id === id);

  if (!lens) {
    notFound();
  }

  const t = await getTranslations("LensDetail");
  const tBrand = await getTranslations("Brands");
  const url = getLensUrl(lens, locale);
  const shopLinks = getShopLinks(lens);

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
    macro: t("macroLabel"),
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
  const reportableFields = [
    ...resolvedGroups.flatMap((group) =>
      group.rows.map((row) => ({ label: row.label, currentValue: row.plainText, group: group.label }))
    ),
    ...(url ? [{ label: t("fieldOfficialLink"), currentValue: url, group: mediaGroupLabel }] : []),
    { label: t("fieldLensImage"), currentValue: getLensImageUrl(lens.id), group: mediaGroupLabel, hideCurrentValue: true },
  ];

  return (
    <>
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-24 flex flex-col gap-8">
      {/* Back button */}
      <BackButton fallbackHref="/lenses" />

      {/* Main content */}
      <div className="flex flex-col sm:flex-row gap-8">
        {/* Image */}
        <div className="w-full max-w-56 mx-auto sm:mx-0 shrink-0 sm:w-56">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={getLensImageUrl(lens.id)}
                alt={lens.model}
                fill
                sizes="224px"
                style={lensImageStyle}
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-5">
          {/* Title */}
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tBrand(lens.brand)}
              {lens.series ? ` · ${lens.series}` : ""}
            </p>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1 font-heading">
              {lens.model}
            </h1>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
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
            </div>
            <FeedbackTrigger
              type="data_issue"
              context={{ lensId: lens.id, lensModel: lens.model, lensBrand: tBrand(lens.brand) }}
              fields={reportableFields}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors self-start"
            >
              <Flag size={11} />
              {t("reportIssue")}
            </FeedbackTrigger>
          </div>

          {/* Where to buy — links to each brand's own official channel.
              X-Glass does not store prices; the brand's store shows them. */}
          {shopLinks.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {t("whereToBuyHeading")}
              </span>
              <div className="flex flex-wrap gap-2">
                {shopLinks.map((link) => (
                  <ExternalLink
                    key={link.market}
                    href={link.url}
                    className={ACTION_OUTLINE_CLS}
                  >
                    {link.market === "cn" ? t("whereToBuyCn") : t("whereToBuyGlobal")}
                  </ExternalLink>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                {t("whereToBuyDisclaimer")}
              </p>
            </div>
          )}

          {/* Grouped spec table */}
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
        </div>
      </div>
    </div>
    <BackToTopButton />
    </>
  );
}
