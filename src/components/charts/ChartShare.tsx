"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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

const TRIGGER_CLS = cn(ACTION_PRIMARY_CLS, "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium");

/**
 * The chart share button with its heading and caption; the poster says what is on screen. A chart
 * page leads with it; a brand page puts it among its header utilities.
 */
function ChartShareButton({
  title,
  fileName,
  poster,
  trigger = "primary",
}: {
  title: string;
  fileName: string;
  poster: React.ReactNode;
  trigger?: "primary" | "utility";
}) {
  const t = useTranslations("Charts");
  return (
    <ShareButton
      heading={t("shareChart")}
      caption={t("shareCaption")}
      label={trigger === "primary" ? t("shareChart") : undefined}
      shareText={t("shareText", { title })}
      triggerClassName={trigger === "primary" ? TRIGGER_CLS : UTILITY_BTN_CLS}
      poster={{ content: poster, width: POSTER_WIDTH, fileName, imageText: t("shareText", { title }) }}
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
  description: string;
  dataDate: string;
};

export function TimelineShareFromUrl(props: TimelineShareProps) {
  return <TimelineShare {...props} selection={useSelection(props.brands)} />;
}

export function TimelineShare({ title, description, dataDate, selection, ...chart }: TimelineShareProps & { selection: ChartSelection }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const shareUrl = useShareUrl();
  const brand = selection.brand;
  return (
    <ChartShareButton
      title={title}
      fileName={brand ? `timeline_${brand}` : "timeline"}
      poster={
        <TimelinePoster
          {...chart}
          selection={{ brand }}
          text={{
            title,
            subtitle: brand ? t("timelinePosterHighlight", { brand: brandLabel(tBrand, brand) }) : description,
            cta: t("timelinePosterCta"),
            note: t("posterDataNote", { date: dataDate }),
            shareUrl,
          }}
        />
      }
    />
  );
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
  return (
    <ChartShareButton
      title={title}
      fileName={["weight", selection.brand, selection.focal].filter(Boolean).join("_")}
      poster={
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
      }
    />
  );
}

export function LineupShare({
  lineup,
  name,
  otherBrands,
  title,
  summary,
  dataDate,
}: {
  lineup: Lineup;
  name: string;
  otherBrands: number;
  title: string;
  summary: string;
  dataDate: string;
}) {
  const t = useTranslations("Charts");
  const shareUrl = useShareUrl();
  return (
    <ChartShareButton
      trigger="utility"
      title={title}
      fileName={`lineup_${lineup.brand}`}
      poster={
        <LineupPoster
          lineup={lineup}
          text={{
            title: t("lineupPosterTitle", { brand: lineup.brand, label: name, count: lineup.count }),
            subtitle: summary,
            cta: t("lineupPosterCta", { others: otherBrands }),
            note: t("posterDataNote", { date: dataDate }),
            shareUrl,
          }}
        />
      }
    />
  );
}

/** A chart page without a poster yet shares its link only. */
export function ChartLinkShare({ title }: { title: string }) {
  const t = useTranslations("Charts");
  return <ShareButton heading={t("shareChart")} caption={t("shareCaption")} shareText={t("shareText", { title })} triggerClassName={TRIGGER_CLS} />;
}
