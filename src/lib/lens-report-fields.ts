import {
  buildSpecGroups,
  resolveSpecGroups,
  type ResolvedSpecGroup,
  type SpecGroupLabels,
  type SpecValueTextLabels,
} from "./lens-spec-groups";
import { pickPriceEntry, formatPriceForReport } from "./lens-pricing";
import { getLensUrl } from "./lens";
import { getLensImageUrl } from "./lens-image";
import type { Lens } from "./types";
import type { FeedbackField } from "./feedback";

// Loosely typed like lens-pricing's Translator so either useTranslations (client)
// or getTranslations (server) satisfies it; `raw` is needed by price formatting.
type Translator = ((key: string, values?: Record<string, string | number>) => string) & {
  raw: (key: string) => string;
};

function specGroupLabels(t: Translator): SpecGroupLabels {
  return {
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
  };
}

function specValueTextLabels(t: Translator): SpecValueTextLabels {
  return {
    yes: t("yes"),
    no: t("no"),
    partial: t("partial"),
    unknown: t("unknown"),
    missing: t("missing"),
  };
}

/**
 * Resolves a lens's spec table and the reportable-field list from the same
 * source, so the rendered spec table (lens detail) and the feedback field
 * picker stay in lockstep. Pure in (lens, locale, translations) — which is what
 * lets the mobile feedback page reconstruct the exact field list from a lensId
 * in the URL instead of carrying the field objects across navigation.
 */
export function resolveLensSpecAndFields({
  lens,
  locale,
  t,
  tPricing,
}: {
  lens: Lens;
  locale: string;
  t: Translator;
  tPricing: Translator;
}): {
  resolvedGroups: ResolvedSpecGroup[];
  valueCellLabels: SpecValueTextLabels;
  reportableFields: FeedbackField[];
} {
  const valueCellLabels = specValueTextLabels(t);
  const resolvedGroups = resolveSpecGroups(
    buildSpecGroups(specGroupLabels(t)),
    lens,
    valueCellLabels,
  );

  const priceSelection = pickPriceEntry(lens.pricing, locale);
  const url = getLensUrl(lens, locale);
  const mediaGroupLabel = t("fieldGroupMedia");

  const reportableFields: FeedbackField[] = [
    ...resolvedGroups.flatMap((group) =>
      group.rows.map((row) => ({
        label: row.label,
        currentValue: row.plainText,
        group: group.label,
      })),
    ),
    ...(priceSelection
      ? [
          {
            label: tPricing("fieldLabel"),
            currentValue: formatPriceForReport(priceSelection, locale, tPricing),
            group: tPricing("groupLabel"),
          },
        ]
      : []),
    ...(url
      ? [{ label: t("fieldOfficialLink"), currentValue: url, group: mediaGroupLabel }]
      : []),
    {
      label: t("fieldLensImage"),
      currentValue: getLensImageUrl(lens.id),
      group: mediaGroupLabel,
      hideCurrentValue: true,
    },
  ];

  return { resolvedGroups, valueCellLabels, reportableFields };
}
