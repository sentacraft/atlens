"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Lens } from "@/lib/types";
import { SharePoster, type PosterLabels } from "@/components/share/poster/SharePoster";
import { ShareButton } from "@/components/share/ShareButton";
import { useShareCapabilities } from "@/hooks/useShareCapabilities";
import { useShareUrl } from "@/hooks/useShareUrl";
import { CustomizePopover } from "./CustomizePopover";
import { lensDisplayName, brandLabel } from "@/lib/lens/format";
import { SITE } from "@/config/site";
import type { NamespaceTranslator } from "@/i18n/translator";

const POSTER_W = 750;

function computePosterTitle(
  lenses: Lens[],
  tBrand: NamespaceTranslator<"Brands">,
  tImage: NamespaceTranslator<"ShareImage">,
): string[] {
  if (lenses.length >= 2) {
    const uniqueBrands = [...new Set(lenses.map((l) => brandLabel(tBrand, l.brand)))];
    return [tImage("comparisonTitle", { brands: uniqueBrands.join(" · ") })];
  }
  return lenses.map((l) => lensDisplayName(brandLabel(tBrand, l.brand), l.series, l.model));
}

/** Shares one lens or a comparison: the link, or a spec poster whose title and slogan can be edited. */
export function LensShareButton({
  lenses,
  variant,
  triggerClassName,
  presetTitle,
  presetSubtitle,
}: {
  lenses: Lens[];
  variant?: "default" | "fab";
  triggerClassName?: string;
  presetTitle?: string;
  presetSubtitle?: string;
}) {
  const t = useTranslations("Share");
  const locale = useLocale();
  const tImage = useTranslations("ShareImage");
  const tBrand = useTranslations("Brands");
  const tPricing = useTranslations("Pricing");
  const tSpecialty = useTranslations("SpecialtyBadge");
  const { isDesktop } = useShareCapabilities();
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [sloganOverride, setSloganOverride] = useState<string | null>(null);
  const shareUrl = useShareUrl();

  const isSingle = lenses.length === 1;
  const computedPosterTitle = computePosterTitle(lenses, tBrand, tImage);
  const effectiveTitle = titleOverride ?? presetTitle ?? "";
  const effectiveSlogan = sloganOverride ?? presetSubtitle ?? "";
  const cta = isSingle ? t("shareCtaSingle") : t("shareCtaMulti", { count: lenses.length });

  const posterLabels: PosterLabels = {
    appName: "Atlens",
    siteUrl: `${SITE.host}/${locale}`,
    brandTagline: tImage("brandTagline"),
    cta: isSingle ? tImage("ctaSingle") : tImage("cta"),
    comparison: computedPosterTitle,
    sectionFocalCoverage: tImage("sectionFocalCoverage"),
    sectionFocus: tImage("sectionFocus"),
    sectionSizeWeight: tImage("sectionSizeWeight"),
    sectionFeatures: tImage("sectionFeatures"),
    minFocusLabel: tImage("minFocusLabel"),
    maxMagLabel: tImage("maxMagLabel"),
    macroLabel: tImage("macroLabel"),
    normalLabel: tImage("normalLabel"),
    weightLabel: tImage("weightLabel"),
    dimensionsLabel: tImage("dimensionsLabel"),
    filterLabel: tImage("filterLabel"),
    focusMotorLabel: tImage("focusMotorLabel"),
    tStopLabel: tImage("tStopLabel"),
    lensConfigLabel: tImage("lensConfigLabel"),
    featureWR: tImage("featureWR"),
    wrPartialSub: tImage("wrPartialSub"),
    featureOIS: tImage("featureOIS"),
    featureAF: tImage("featureAF"),
    featureApertureRing: tImage("featureApertureRing"),
    featurePowerZoom: tImage("featurePowerZoom"),
    featureInternalZoom: tImage("featureInternalZoom"),
    motorLinear: tImage("motorLinear"),
    motorStepping: tImage("motorStepping"),
    motorDc: tImage("motorDc"),
    motorOther: tImage("motorOther"),
    wide: tImage("wide"),
    tele: tImage("tele"),
    tagCine: tSpecialty("cine"),
    tagAnamorphic: tSpecialty("anamorphic"),
    tagTilt: tSpecialty("tilt"),
    tagShift: tSpecialty("shift"),
    tagMacro: tSpecialty("macro"),
    tagFisheye: tSpecialty("fisheye"),
    tagProbe: tSpecialty("probe"),
    na: tImage("na"),
    priceLabel: tImage("priceLabel"),
    usedBadge: tImage("usedBadge"),
    pricing: tPricing,
    disclaimerWarn: tPricing("disclaimerWarn"),
    locale,
  };

  const custom = { title: effectiveTitle.trim() || undefined, slogan: effectiveSlogan.trim() || undefined };
  const fileName = lenses
    .map((l) => l.model.replace(/\s+/g, "-").toLowerCase())
    .join("_vs_")
    .slice(0, 60);

  return (
    <ShareButton
      heading={isSingle ? t("titleSingle") : t("title")}
      caption={lenses.map((l) => lensDisplayName(brandLabel(tBrand, l.brand), l.series, l.model)).join(" / ")}
      shareText={cta}
      variant={variant}
      triggerClassName={triggerClassName}
      poster={{
        width: POSTER_W,
        fileName,
        imageText: [cta, effectiveSlogan.trim()].filter(Boolean).join("\n"),
        content: <SharePoster lenses={lenses} labels={posterLabels} custom={custom} shareUrl={shareUrl} />,
        extraActions: isDesktop ? (
          <CustomizePopover
            title={effectiveTitle}
            slogan={effectiveSlogan}
            onTitleChange={(v) => setTitleOverride(v || null)}
            onSloganChange={(v) => setSloganOverride(v || null)}
            titlePlaceholder={computedPosterTitle.join(" · ")}
          />
        ) : undefined,
      }}
    />
  );
}
