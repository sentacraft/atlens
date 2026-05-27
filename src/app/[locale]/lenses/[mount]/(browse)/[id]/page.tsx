import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Flag } from "lucide-react";
import { routing } from "@/i18n/routing";
import { getLensesByMount, getLensUrl } from "@/lib/lens";
import { urlSegmentToMount, mountToUrlSegment } from "@/lib/mount";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens-image";
import { buildSpecGroups, resolveSpecGroups } from "@/lib/lens-spec-groups";
import type { ResolvedSpecRow, StructuredLine } from "@/lib/lens-spec-groups";
import { ExternalLink } from "@/components/ui/external-link";
import LensDetailCompareToggle from "@/components/LensDetailCompareToggle";
import BackToTopButton from "@/components/BackToTopButton";
import LensDetailTelemetry from "@/components/telemetry/LensDetailTelemetry";
import ShareFAB from "@/components/ShareFAB";
import { ShareButton } from "@/components/share/ShareButton";
import FeedbackTrigger from "@/components/FeedbackTrigger";
import JsonLd from "@/components/JsonLd";
import Breadcrumb from "@/components/Breadcrumb";
import SpecialtyBadges from "@/components/SpecialtyBadges";
import { deriveSpecialty } from "@/lib/lens-specialty";
import { RetailersDropdown } from "@/components/RetailersDropdown";
import { UTILITY_BTN_CLS } from "@/lib/ui-tokens";
import { getMemberCollections } from "@/lib/collections";
import { Link } from "@/i18n/navigation";
import { BoolCell } from "@/components/ui/bool-cell";
import { FieldNotePopover } from "@/components/ui/field-note-popover";
import { buildAlternates, lensOgImages } from "@/lib/seo";
import { SITE } from "@/config/site";
import { pickPriceEntry, formatPriceForReport } from "@/lib/lens-pricing";
import { lensDisplayName, lensSubtitleLine } from "@/lib/lens.format";
import { buildLensDescription, buildLensProductSchema } from "@/lib/lens-seo";
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
  const t = await getTranslations({ locale, namespace: "LensDetail" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  // The [mount]/layout.tsx ahead of this page already calls notFound() on an
  // invalid mount segment, so urlSegmentToMount is guaranteed to return a
  // valid Mount here. Re-check defensively in case the layout contract is
  // ever weakened — silently treating an unknown mount as "X" would mis-route
  // lens lookups and is far worse than a 404.
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    return { title: t("notFoundTitle") };
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  const lens = lenses.find((l) => l.id === id);
  if (!lens) {
    return { title: t("notFoundTitle") };
  }

  const brandName = tBrand(lens.brand);
  const displayName = lensDisplayName(brandName, lens.series, lens.model);
  const description = buildLensDescription({ lens, mount: resolvedMount, brandName, t });

  return {
    title: displayName,
    description,
    openGraph: {
      title: `${displayName} | X-Glass`,
      description,
      images: lensOgImages(lens.id),
    },
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
  // See note on the matching guard in generateMetadata — the parent layout
  // already validates mount, but we re-check rather than silently fall back
  // to "X" and mis-route the lens lookup.
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    notFound();
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  const lens = lenses.find((l) => l.id === id);

  if (!lens) {
    notFound();
  }

  const t = await getTranslations("LensDetail");
  const tBrand = await getTranslations("Brands");
  const tPricing = await getTranslations("Pricing");
  const tNav = await getTranslations("Nav");
  const url = getLensUrl(lens, locale);

  const seg = mountToUrlSegment(resolvedMount);
  // Derived values shared between the visible header and the Product JSON-LD.
  const brandName = tBrand(lens.brand);
  const displayName = lensDisplayName(brandName, lens.series, lens.model);
  const description = buildLensDescription({ lens, mount: resolvedMount, brandName, t });
  const canonicalUrl = `${SITE.url}/${locale}/lenses/${mount}/${id}`;
  const productSchema = buildLensProductSchema({
    lens,
    mount: resolvedMount,
    displayName,
    description,
    brandName,
    canonicalUrl,
  });

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
    motorClass: {
      linear: t("motorLinear"),
      stepping: t("motorStepping"),
      dc: t("motorDc"),
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
  const memberCollections = getMemberCollections(lens, resolvedMount, locale);

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
    {/* Product structured data — earns this page eligibility for Google's
        Product rich result treatment. Emitted via JsonLd which handles the
        `</script>` defensive escape; see that component for rationale. */}
    <JsonLd data={productSchema} />
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-[max(10rem,calc(var(--compare-bar-height,0px)+8rem))] flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Breadcrumb
              segments={[{ label: tNav("lenses"), href: `/lenses/${seg}` }]}
              current={displayName}
            />
        <div className="flex items-center gap-1">
          <ShareButton lenses={[lens]} triggerClassName={UTILITY_BTN_CLS} />
          <FeedbackTrigger
            type="data_issue"
            context={{ lensId: lens.id, lensModel: lens.model, lensBrand: tBrand(lens.brand) }}
            fields={reportableFields}
            className={UTILITY_BTN_CLS}
          >
            <Flag className="size-4" />
            <span className="hidden sm:inline">{t("reportIssue")}</span>
          </FeedbackTrigger>
        </div>
      </div>

      {/* Header: image + key info side by side */}
      <div className="flex flex-col sm:flex-row gap-8">
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

        <div className="flex-1 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {lensSubtitleLine(brandName, lens.series)}
                </span>
                <SpecialtyBadges {...deriveSpecialty(lens)} />
              </div>
              {url && (
                <ExternalLink href={url} className="shrink-0 inline-flex items-center gap-0.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
                  {t("officialSite")}
                </ExternalLink>
              )}
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-heading leading-[1.1]">
              {displayName}
            </h1>
          </div>

          <PriceSection lens={lens} />

          <div className="mt-auto flex flex-wrap items-center gap-2">
            <LensDetailCompareToggle lensId={lens.id} />
            <RetailersDropdown lens={lens} customId="detail" />
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
              <Flag className="size-4" />
              {t("reportIssue")}
            </FeedbackTrigger>
          </div>
      </div>

      {memberCollections.length > 0 && (
        <section className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t("collectionsTitle")}
            </h2>
            <Link
              href={`/lenses/${mount}/collections`}
              className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t("viewAllCollections")} →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {memberCollections.map((c) => (
              <Link
                key={c.slug}
                href={`/lenses/${mount}/collections/${c.slug}`}
                className="group inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm transition-colors hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
              >
                <span className="font-normal text-zinc-900 group-hover:text-white dark:text-zinc-100 dark:group-hover:text-zinc-900">
                  {locale === "zh" ? c.title.zh : c.title.en}
                </span>
                <span className="text-xs text-zinc-400 group-hover:text-zinc-400 dark:text-zinc-500 dark:group-hover:text-zinc-500">
                  {c.lensCount}
                </span>
                <span className="text-zinc-300 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
    <BackToTopButton />
    <ShareFAB lenses={[lens]} />
    <LensDetailTelemetry lensSlug={lens.id} />
    </>
  );
}
