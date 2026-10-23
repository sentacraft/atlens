import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Flag } from "lucide-react";
import { getLensUrl } from "@/lib/lens/lens";
import { getLensesByMount } from "@/lib/lens/data";
import { mountHasCollections, urlSegmentToMount } from "@/lib/mount";
import { lensImageStyle, getLensImageUrl } from "@/lib/lens/image";
import { buildSpecGroups, buildSpecGroupLabels, resolveSpecGroups, rowPlainText } from "@/lib/lens/spec-groups";
import type { ResolvedSpecRow, StructuredLine } from "@/lib/lens/spec-groups";
import { Link } from "@/i18n/navigation";
import { ExternalLink } from "@/components/ui/external-link";
import LensDetailCompareToggle from "@/components/compare/LensDetailCompareToggle";
import LensDetailSaveActions from "@/components/lens/LensDetailSaveActions";
import SupportNote from "@/components/support/SupportNote";
import BackToTopButton from "@/components/nav/BackToTopButton";
import LensDetailTelemetry from "@/components/lens/LensDetailTelemetry";
import ShareFAB from "@/components/share/ShareFAB";
import { LensShareButton } from "@/components/share/LensShareButton";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumb from "@/components/nav/Breadcrumb";
import SpecialtyBadges from "@/components/lens/SpecialtyBadges";
import { deriveSpecialty } from "@/lib/lens/specialty";
import { RetailersDropdown } from "@/components/price/RetailersDropdown";
import { getBrandInfo } from "@/lib/brands";
import { getMemberCollections } from "@/lib/collections";
import { getCollectionLensCounts } from "@/lib/collection-stats";
import CollectionPills from "@/components/collection/CollectionPills";
import SameFocalAlternatives from "@/components/lens/SameFocalAlternatives";
import LensReviewSearch from "@/components/lens/LensReviewSearch";
import { BoolCell } from "@/components/ui/bool-cell";
import { FieldNotePopover } from "@/components/ui/field-note-popover";
import { buildAlternates, lensOgImages } from "@/lib/seo";
import { SITE } from "@/config/site";
import { pickPriceEntry, formatPriceForReport } from "@/lib/lens/pricing";
import { lensDisplayName, brandLabel } from "@/lib/lens/format";
import { buildLensDescription, buildLensProductSchema } from "@/lib/lens/seo";
import { PriceSection } from "@/components/price/PriceSection";
import { PriceDisclaimer } from "@/components/price/PriceDisclaimer";
import { brandPath, browsePath, lensPath } from "@/lib/url/routes";
import { DataSourceBar } from "@/components/lens/DataSource";
import { PAGE_GUTTER_CLS, TEXT_LINK_CLS, UTILITY_BTN_CLS } from "@/config/ui-tokens";

type Params = Promise<{ locale: string; mount: string; id: string }>;

export function generateStaticParams({ params }: { params: { locale: string; mount: string } }) {
  const resolvedMount = urlSegmentToMount(params.mount);
  if (!resolvedMount) {
    return [];
  }

  return getLensesByMount(resolvedMount, params.locale).map((lens) => ({ id: lens.id }));
}

// Keep dynamicParams at its default: `false` makes OpenNext 404 every request to this route,
// prerendered ids included, while `next start` serves them fine (PR #397).

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, mount, id } = await params;
  const t = await getTranslations({ locale, namespace: "LensDetail" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  const resolvedMount = urlSegmentToMount(mount);
  if (!resolvedMount) {
    return { title: t("notFoundTitle") };
  }
  const lenses = getLensesByMount(resolvedMount, locale);
  const lens = lenses.find((l) => l.id === id);
  if (!lens) {
    return { title: t("notFoundTitle") };
  }

  const brandName = brandLabel(tBrand, lens.brand);
  const displayName = lensDisplayName(brandName, lens.series, lens.model);
  const description = buildLensDescription({ lens, mount: resolvedMount, brandName, t });

  return {
    title: t("metaTitle", { name: displayName }),
    description,
    openGraph: {
      title: `${displayName} | Atlens`,
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
            <span className="text-[11px] text-zinc-400">
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
          <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
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
          <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-zinc-400">
            {resolved.subValue}
          </p>
        )}
      </div>
    );
  }
  return (
    <div>
      <span className="whitespace-pre-line">{resolved.displayValue ?? labels.missing}</span>
      {resolved.subValue && (
        <p className="mt-0.5 whitespace-pre-line text-[11px] leading-relaxed text-zinc-400">
          {resolved.subValue}
        </p>
      )}
    </div>
  );
}

export default async function LensDetailPage({ params }: { params: Params }) {
  const { id, locale, mount } = await params;
  setRequestLocale(locale);
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

  const brandName = brandLabel(tBrand, lens.brand);
  const displayName = lensDisplayName(brandName, lens.series, lens.model);
  const description = buildLensDescription({ lens, mount: resolvedMount, brandName, t });
  const hasBrandPage = mountHasCollections(resolvedMount) && getBrandInfo(lens.brand) !== undefined;
  const canonicalUrl = `${SITE.url}/${locale}${lensPath(lens)}`;
  const productSchema = buildLensProductSchema({
    lens,
    mount: resolvedMount,
    displayName,
    description,
    brandName,
    canonicalUrl,
  });

  const specGroups = buildSpecGroups(buildSpecGroupLabels(t));

  const valueCellLabels = {
    yes: t("yes"),
    no: t("no"),
    partial: t("partial"),
    unknown: t("unknown"),
    missing: t("missing"),
  };

  const resolvedGroups = resolveSpecGroups(specGroups, lens);

  const mediaGroupLabel = t("fieldGroupMedia");
  const memberCollections = getMemberCollections(lens, locale);

  const priceSelection = pickPriceEntry(lens.pricing, locale);
  const reportableFields = [
    ...resolvedGroups.flatMap((group) =>
      group.rows.map((row) => ({ label: row.label, currentValue: rowPlainText(row, valueCellLabels), group: group.label }))
    ),
    ...(priceSelection
      ? [{ label: tPricing("fieldLabel"), currentValue: formatPriceForReport(priceSelection, tPricing), group: tPricing("groupLabel") }]
      : []),
    ...(url ? [{ label: t("fieldOfficialLink"), currentValue: url, group: mediaGroupLabel }] : []),
    { label: t("fieldLensImage"), currentValue: getLensImageUrl(lens.id), group: mediaGroupLabel, hideCurrentValue: true },
  ];

  return (
    <>
    <JsonLd data={productSchema} />
    <div className={`w-full max-w-4xl mx-auto pt-8 pb-[max(10rem,calc(var(--compare-bar-height,0px)+8rem))] flex flex-col gap-8 ${PAGE_GUTTER_CLS}`}>
      <div className="flex items-center justify-between">
        <Breadcrumb
              segments={[{ label: tNav("lenses"), href: browsePath(resolvedMount) }]}
              current={displayName}
            />
        <div className="flex items-center gap-1">
          <LensShareButton lenses={[lens]} trigger="utility" />
          <FeedbackTrigger
            type="data_issue"
            context={{ lensId: lens.id, lensModel: lens.model, lensBrand: brandLabel(tBrand, lens.brand) }}
            fields={reportableFields}
            className={UTILITY_BTN_CLS}
          >
            <Flag className="size-4" />
            <span className="hidden sm:inline">{t("reportIssue")}</span>
          </FeedbackTrigger>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        <div className="w-full max-w-64 mx-auto sm:mx-0 shrink-0 sm:w-64">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5">
            <div className="relative aspect-square w-full overflow-hidden">
              <Image
                src={getLensImageUrl(lens.id)}
                alt={lens.model}
                fill
                sizes="256px"
                style={lensImageStyle}
                className="object-contain"
                // `priority` is deprecated in Next 16.
                preload
                fetchPriority="high"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-normal text-zinc-500">
                {hasBrandPage ? (
                  <Link
                    href={brandPath(resolvedMount, lens.brand)}
                    className="underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
                  >
                    {brandName}
                  </Link>
                ) : (
                  brandName
                )}
                {lens.series && ` · ${lens.series}`}
              </span>
              <SpecialtyBadges {...deriveSpecialty(lens)} />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 font-heading leading-[1.1]">
              {displayName}
            </h1>
          </div>

          <PriceSection lens={lens} />

          <div className="mt-auto flex flex-col gap-2">
            {/* Labels shorten by this row's width, so Iris's side panel narrowing the page counts too. */}
            <div data-testid="lens-detail-actions" className="@container">
              <div className="flex items-center gap-2">
                <LensDetailCompareToggle lensId={lens.id} />
                <RetailersDropdown lens={lens} customId="detail" />
              </div>
            </div>
            <LensDetailSaveActions lensId={lens.id} />
          </div>
        </div>
      </div>

      {priceSelection && (
        <PriceDisclaimer className="-mt-3 border-t border-zinc-100 pt-3" />
      )}

      <div>
        <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <DataSourceBar
              className="border-b border-zinc-200"
              source={
                url ? (
                  <ExternalLink href={url} className={`inline-flex items-center gap-0.5 font-medium ${TEXT_LINK_CLS}`}>
                    {t("sourceSite", { brand: brandName })}
                  </ExternalLink>
                ) : (
                  <span className="font-medium text-zinc-700">{t("sourceSite", { brand: brandName })}</span>
                )
              }
            />
            {resolvedGroups.map((group, groupIdx) => (
              <div
                key={group.label}
                className={groupIdx > 0 ? "border-t border-zinc-200" : ""}
              >
                <div className="px-4 py-2 bg-zinc-100/80">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {group.label}
                  </span>
                </div>

                <table className="w-full text-sm">
                  <tbody>
                    {group.rows.map((resolved) => (
                      <tr
                        key={resolved.label}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-xs font-medium text-zinc-500 bg-zinc-50/60 w-40 align-top">
                          <div className="flex items-center gap-1">
                            <span className="whitespace-nowrap">{resolved.label}</span>
                            {resolved.labelNote && <FieldNotePopover note={resolved.labelNote} variant={resolved.labelNoteVariant} />}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-700">
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
          <p className="px-2 pt-4 text-xs text-zinc-400">
            {t("nudgeText")}{" "}
            <FeedbackTrigger
              type="data_issue"
              context={{ lensId: lens.id, lensModel: lens.model, lensBrand: brandLabel(tBrand, lens.brand) }}
              fields={reportableFields}
            >
              {t("feedbackLink")}
            </FeedbackTrigger>
          </p>
      </div>

      <LensReviewSearch lens={lens} locale={locale} />

      <SameFocalAlternatives lens={lens} lenses={lenses} />

      <CollectionPills
        collections={memberCollections}
        lensCounts={getCollectionLensCounts(locale)}
        mount={resolvedMount}
        locale={locale}
        title={t("collectionsTitle")}
        viewAllLabel={t("viewAllCollections")}
      />
      <SupportNote className="mt-6" />
    </div>
    <BackToTopButton />
    <ShareFAB lenses={[lens]} />
    <LensDetailTelemetry lensSlug={lens.id} />
    </>
  );
}
