"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LineupPoster, TimelinePoster, WeightPoster } from "@/components/charts/posters/ChartPosters";
import { POSTER_WIDTH } from "@/components/charts/posters/PosterFrame";
import { ShareButton } from "@/components/share/ShareButton";
import { ACTION_PRIMARY_CLS, UTILITY_BTN_CLS } from "@/config/ui-tokens";
import { useShareUrl } from "@/hooks/useShareUrl";
import type { BrandCount, ChartLens } from "@/lib/charts/catalog";
import type { Lineup } from "@/lib/charts/lineup";
import type { TimelineEntry, TimelineYear } from "@/lib/charts/timeline";
import type { WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";

const TRIGGER_CLS = {
  primary: cn(ACTION_PRIMARY_CLS, "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium"),
  utility: UTILITY_BTN_CLS,
  section: cn(UTILITY_BTN_CLS, "shrink-0 font-sans font-normal"),
};

/**
 * The chart share button with its heading and caption; the poster says what is on screen. A chart
 * page leads with it; a brand page puts it among its header utilities and beside each chart's heading.
 */
function ChartShareButton({
  title,
  posters,
  trigger = "primary",
}: {
  title: string;
  posters: { label: string; fileName: string; content: React.ReactNode }[];
  trigger?: keyof typeof TRIGGER_CLS;
}) {
  const t = useTranslations("Charts");
  return (
    <ShareButton
      heading={t("shareChart")}
      caption={t("shareCaption")}
      label={trigger === "utility" ? undefined : t("shareChart")}
      shareText={t("shareText", { title })}
      triggerClassName={TRIGGER_CLS[trigger]}
      posters={posters.map((poster) => ({ ...poster, width: POSTER_WIDTH, imageText: t("shareText", { title }) }))}
    />
  );
}

function useSelection(brands: BrandCount[]): ChartSelection {
  return readChartSelectionFromSearch(useSearchParams(), brands.map((b) => b.brand));
}

type TimelineShareProps = {
  mount: Mount;
  entries: TimelineEntry[];
  years: TimelineYear[];
  brands: BrandCount[];
  title: string;
  dataDate: string;
};

export function TimelineShareFromUrl(props: TimelineShareProps) {
  return <TimelineShare {...props} selection={useSelection(props.brands)} />;
}

export function TimelineShare({ title, dataDate, selection, ...chart }: TimelineShareProps & { selection: ChartSelection }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const locale = useLocale();
  const brandList = new Intl.ListFormat(locale, { type: "conjunction" }).format(chart.brands.map((b) => brandLabel(tBrand, b.brand)));
  const shareUrl = useShareUrl();
  const brand = selection.brand;
  const poster = (
    <TimelinePoster
      {...chart}
      selection={{ brand }}
      text={{
        title,
        subtitle: brand
          ? t("timelinePosterHighlight", { brand: brandLabel(tBrand, brand) })
          : t("timelinePosterSubtitle", { count: chart.entries.length, brands: brandList }),
        cta: t("timelinePosterCta"),
        note: t("posterDataNote", { date: dataDate }),
        shareUrl,
      }}
    />
  );
  return <ChartShareButton title={title} posters={[{ label: t("posterTimeline"), fileName: brand ? `timeline_${brand}` : "timeline", content: poster }]} />;
}

type WeightShareProps = {
  tiers: WeightTier[];
  brands: BrandCount[];
  title: string;
  ratio: number;
  count: number;
  maxG: number;
  minG: number;
  dataDate: string;
};

export function WeightShareFromUrl(props: WeightShareProps) {
  return <WeightShare {...props} selection={useSelection(props.brands)} />;
}

export function WeightShare({ tiers, brands, title, ratio, count, maxG, minG, dataDate, selection }: WeightShareProps & { selection: ChartSelection }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const tList = useTranslations("LensList");
  const shareUrl = useShareUrl();
  const matches = (lens: ChartLens) =>
    (!selection.brand || lens.brand === selection.brand) && (!selection.focal || lens.focalCategories.includes(selection.focal));
  const filters = [
    selection.brand && brandLabel(tBrand, selection.brand),
    selection.focal && tList(`category-${selection.focal}`),
  ].filter(Boolean);
  const shown = tiers.reduce((n, tier) => n + tier.lenses.filter(matches).length, 0);
  const note = [t("weightPosterNote"), t("posterDataNote", { date: dataDate })].join(" · ");
  const poster = (
    <WeightPoster
      tiers={tiers}
      matches={matches}
      text={
        filters.length > 0
          ? {
              title,
              subtitle: t("weightPosterFiltered", { filters: filters.join(" · "), count: shown }),
              cta: t("weightPosterCta"),
              note,
              shareUrl,
            }
          : {
              title: t("weightPosterTitle", { ratio }),
              subtitle: t("weightPosterSubtitle", {
                brandCount: brands.length,
                count,
                max: t("weight", { weight: maxG }),
                min: t("weight", { weight: minG }),
              }),
              cta: t("weightPosterCta"),
              note,
              shareUrl,
            }
      }
    />
  );
  return <ChartShareButton title={title} posters={[{ label: t("tabWeight"), fileName: ["weight", selection.brand, selection.focal].filter(Boolean).join("_"), content: poster }]} />;
}

/**
 * A brand page shares its lineup, and its release timeline when its lenses have years; `only`
 * narrows it to one of them, for the button beside that chart's heading.
 */
export function BrandShare({
  only,
  mount,
  lineup,
  timeline,
  name,
  otherBrands,
  title,
  summary,
  dataDate,
}: {
  only?: "lineup" | "timeline";
  mount: Mount;
  lineup: Lineup;
  timeline: { entries: TimelineEntry[]; years: TimelineYear[]; brands: BrandCount[] };
  name: string;
  otherBrands: number;
  title: string;
  summary: string;
  dataDate: string;
}) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brand");
  const shareUrl = useShareUrl();
  const note = t("posterDataNote", { date: dataDate });
  const posters = [
    {
      key: "lineup",
      label: t("posterLineup"),
      fileName: `lineup_${lineup.brand}`,
      content: (
        <LineupPoster
          lineup={lineup}
          text={{
            title: t("lineupPosterTitle", { brand: lineup.brand, label: name, count: lineup.count }),
            subtitle: summary,
            cta: t("lineupPosterCta", { others: otherBrands }),
            note,
            shareUrl,
          }}
        />
      ),
    },
  ];
  if (timeline.entries.length > 0) {
    const first = String(timeline.years[0].year);
    const last = String(timeline.years[timeline.years.length - 1].year);
    posters.push({
      key: "timeline",
      label: t("posterTimeline"),
      fileName: `timeline_${lineup.brand}`,
      content: (
        <TimelinePoster
          mount={mount}
          {...timeline}
          selection={{}}
          text={{
            title: tBrand("timelinePosterTitle", { brand: lineup.brand, label: name, first, last }),
            subtitle: tBrand("timelinePosterSubtitle", { count: timeline.entries.length }),
            cta: t("timelinePosterCta"),
            note,
            shareUrl,
          }}
        />
      ),
    });
  }
  return (
    <ChartShareButton
      trigger={only ? "section" : "utility"}
      title={title}
      posters={posters.filter((poster) => !only || poster.key === only)}
    />
  );
}

/** A chart page without a poster yet shares its link only. */
export function ChartLinkShare({ title }: { title: string }) {
  const t = useTranslations("Charts");
  return <ShareButton heading={t("shareChart")} caption={t("shareCaption")} shareText={t("shareText", { title })} triggerClassName={TRIGGER_CLS.primary} posters={[]} />;
}
