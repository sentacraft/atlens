"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LineupChart from "@/components/charts/LineupChart";
import TimelineChart from "@/components/charts/TimelineChart";
import WeightLadderChart from "@/components/charts/WeightLadderChart";
import PosterFrame, { POSTER_WIDTH } from "@/components/charts/posters/PosterFrame";
import { ShareButton } from "@/components/share/ShareButton";
import { matchesChartSelection, type BrandCount } from "@/lib/charts/catalog";
import type { Lineup } from "@/lib/charts/lineup";
import type { TimelineEntry, TimelineYear } from "@/lib/charts/timeline";
import type { WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { readChartSelectionFromSearch, type ChartSelection } from "@/lib/url/charts";

type ChartPoster = { label: string; fileName: string; content: (shareUrl: string) => React.ReactNode };

/** The chart share panel's heading and caption around its posters; the poster says what is on screen. */
function ChartShareButton({ title, posters, trigger }: { title: string; posters: ChartPoster[]; trigger: "utility" | "section" }) {
  const t = useTranslations("Charts");
  return (
    <ShareButton
      heading={t("shareChart")}
      caption={t("shareCaption")}
      shareText={t("shareText", { title })}
      trigger={trigger}
      posters={posters.map((poster) => ({ ...poster, width: POSTER_WIDTH, imageText: t("shareText", { title }) }))}
    />
  );
}

function useSelection(brands: BrandCount[], lenses: string[]): ChartSelection {
  return readChartSelectionFromSearch(useSearchParams(), { brands: brands.map((b) => b.brand), lenses });
}

type TimelineShareProps = {
  entries: TimelineEntry[];
  years: TimelineYear[];
  brands: BrandCount[];
  title: string;
  dataDate: string;
};

export function TimelineShareFromUrl(props: TimelineShareProps) {
  return <TimelineShare {...props} selection={useSelection(props.brands, props.entries.map((e) => e.lens.id))} />;
}

export function TimelineShare({ entries, years, brands, title, dataDate, selection }: TimelineShareProps & { selection: ChartSelection }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const locale = useLocale();
  const brandList = new Intl.ListFormat(locale, { type: "conjunction" }).format(brands.map((b) => brandLabel(tBrand, b.brand)));
  const brand = selection.brand;
  const subtitle = brand
    ? t("timelinePosterHighlight", { brand: brandLabel(tBrand, brand) })
    : t("timelinePosterSubtitle", { count: entries.length, brands: brandList });
  return (
    <ChartShareButton
      trigger="utility"
      title={title}
      posters={[
        {
          label: t("posterTimeline"),
          fileName: brand ? `timeline_${brand}` : "timeline",
          content: (shareUrl) => (
            <PosterFrame title={title} subtitle={subtitle} cta={t("timelinePosterCta")} note={t("posterDataNote", { date: dataDate })} shareUrl={shareUrl}>
              <TimelineChart mode={{ kind: "poster", highlight: brand }} entries={entries} years={years} />
            </PosterFrame>
          ),
        },
      ]}
    />
  );
}

type WeightShareProps = {
  tiers: WeightTier[];
  brands: BrandCount[];
  title: string;
  count: number;
  maxG: number;
  minG: number;
  dataDate: string;
};

export function WeightShareFromUrl(props: WeightShareProps) {
  return <WeightShare {...props} selection={useSelection(props.brands, props.tiers.flatMap((tier) => tier.lenses.map((lens) => lens.id)))} />;
}

export function WeightShare({ tiers, brands, title, count, maxG, minG, dataDate, selection }: WeightShareProps & { selection: ChartSelection }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const shown = tiers.reduce((n, tier) => n + tier.lenses.filter((lens) => matchesChartSelection(lens, selection)).length, 0);
  const subtitle =
    selection.brand
      ? t("weightPosterFiltered", { brand: brandLabel(tBrand, selection.brand), count: shown })
      : t("weightPosterSubtitle", {
          brandCount: brands.length,
          count,
          max: t("weight", { weight: maxG }),
          min: t("weight", { weight: minG }),
        });
  const note = [t("weightPosterNote"), t("posterDataNote", { date: dataDate })].join(" · ");
  return (
    <ChartShareButton
      trigger="utility"
      title={title}
      posters={[
        {
          label: t("tabWeight"),
          fileName: selection.brand ? `weight_${selection.brand}` : "weight",
          content: (shareUrl) => (
            <PosterFrame title={title} subtitle={subtitle} cta={t("weightPosterCta")} note={note} shareUrl={shareUrl}>
              <WeightLadderChart tiers={tiers} mode={{ kind: "poster", selection }} />
            </PosterFrame>
          ),
        },
      ]}
    />
  );
}

type BrandPoster = "lineup" | "timeline";

/** A brand page's lineup and release-timeline posters; the timeline is left out when no lens has a year. */
export function BrandShare({
  posters,
  trigger,
  lineup,
  timeline,
  name,
  otherBrands,
  title,
  summary,
  dataDate,
}: {
  posters: BrandPoster[];
  trigger: "utility" | "section";
  lineup: Lineup;
  timeline: { entries: TimelineEntry[]; years: TimelineYear[] };
  name: string;
  otherBrands: number;
  title: string;
  summary: string;
  dataDate: string;
}) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brand");
  const note = t("posterDataNote", { date: dataDate });
  const made: Record<BrandPoster, ChartPoster | undefined> = {
    lineup: {
      label: t("posterLineup"),
      fileName: `lineup_${lineup.brand}`,
      content: (shareUrl) => (
        <PosterFrame
          title={t("lineupPosterTitle", { brand: lineup.brand, label: name, count: lineup.count })}
          subtitle={summary}
          cta={t("lineupPosterCta", { others: otherBrands })}
          note={note}
          shareUrl={shareUrl}
        >
          <LineupChart lineup={lineup} mode={{ kind: "poster" }} />
        </PosterFrame>
      ),
    },
    timeline:
      timeline.entries.length > 0
        ? {
            label: t("posterTimeline"),
            fileName: `timeline_${lineup.brand}`,
            content: (shareUrl) => (
              <PosterFrame
                title={tBrand("timelinePosterTitle", {
                  brand: lineup.brand,
                  label: name,
                  first: String(timeline.years[0].year),
                  last: String(timeline.years[timeline.years.length - 1].year),
                })}
                subtitle={tBrand("timelinePosterSubtitle", { count: timeline.entries.length })}
                cta={t("timelinePosterCta")}
                note={note}
                shareUrl={shareUrl}
              >
                <TimelineChart mode={{ kind: "poster" }} entries={timeline.entries} years={timeline.years} />
              </PosterFrame>
            ),
          }
        : undefined,
  };
  return <ChartShareButton trigger={trigger} title={title} posters={posters.flatMap((key) => made[key] ?? [])} />;
}

/** A chart page without a poster yet shares its link only. */
export function ChartLinkShare({ title }: { title: string }) {
  const t = useTranslations("Charts");
  const tShare = useTranslations("Share");
  return <ShareButton heading={tShare("button")} shareText={t("shareText", { title })} trigger="utility" posters={[]} />;
}
