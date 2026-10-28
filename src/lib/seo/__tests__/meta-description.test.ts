import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { BRANDS } from "@/lib/brands";
import { buildLineup, type Lineup } from "@/lib/charts/lineup";
import { chartBrands } from "@/lib/charts/catalog";
import { buildTimeline } from "@/lib/charts/timeline";
import { buildWeightLadder } from "@/lib/charts/weight";
import { COLLECTIONS } from "@/lib/collections";
import { getCollectionStats } from "@/lib/collection-stats";
import { getLensesByMount } from "@/lib/lens/data";
import { brandLabel } from "@/lib/lens/format";
import {
  META_DESCRIPTION_MAX,
  brandMetaDescription,
  brandSummary,
  collectionMetaDescription,
  lineupsMetaDescription,
  timelineMetaDescription,
  weightMetaDescription,
} from "@/lib/seo/meta-description";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";

const MESSAGES = { en, zh };

function translators(locale: Locale) {
  const messages = MESSAGES[locale];
  return {
    collection: createTranslator({ locale, messages, namespace: "Collection" }),
    brand: createTranslator({ locale, messages, namespace: "Brand" }),
    brands: createTranslator({ locale, messages, namespace: "Brands" }),
    charts: createTranslator({ locale, messages, namespace: "Charts" }),
    root: createTranslator({ locale, messages }),
  };
}

// Search results cut a description off at about 160 characters, or 80 in Chinese.
describe.each(routing.locales)("meta descriptions in %s fit a search result", (locale) => {
  const max = META_DESCRIPTION_MAX[locale];
  const t = translators(locale);
  const lenses = getLensesByMount("X", locale);

  it("for every collection", () => {
    for (const slug of Object.keys(COLLECTIONS)) {
      const description = collectionMetaDescription(t.collection, t.brands, locale, getCollectionStats(slug, locale)!);
      expect(description.length, `${slug}: ${description}`).toBeLessThanOrEqual(max);
    }
  });

  it("for every brand", () => {
    for (const info of BRANDS) {
      const lineup = buildLineup(lenses, info.slug);
      if (!lineup) {
        continue;
      }
      const description = brandMetaDescription(t.brand, locale, {
        brand: info.slug,
        label: brandLabel(t.brands, info.slug),
        summary: brandSummary(t.brand, lineup),
        tagline: info.shortDescription[locale],
      });
      expect(description.length, `${info.slug}: ${description}`).toBeLessThanOrEqual(max);
    }
  });

  it("for the three charts", () => {
    const lineups = chartBrands(lenses)
      .map(({ brand }) => buildLineup(lenses, brand))
      .filter((lineup): lineup is Lineup => lineup !== undefined);
    for (const description of [
      timelineMetaDescription(t.charts, t.brands, locale, buildTimeline(lenses)),
      weightMetaDescription(t.charts, t.brands, locale, buildWeightLadder(lenses), chartBrands(lenses)),
      lineupsMetaDescription(t.charts, t.brands, locale, lineups),
    ]) {
      expect(description.length, description).toBeLessThanOrEqual(max);
    }
  });

  it("for the fixed page copy", () => {
    for (const description of [
      t.root("Metadata.seoDescription"),
      t.root("Collection.indexDescription"),
      t.root("About.metaDescription"),
      t.root("LensList.metaDescX", { count: lenses.length, brandCount: chartBrands(lenses).length }),
    ]) {
      expect(description.length, description).toBeLessThanOrEqual(max);
    }
  });
});
