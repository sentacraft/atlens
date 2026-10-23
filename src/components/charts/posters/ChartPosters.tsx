"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import LineupChart from "@/components/charts/LineupChart";
import TimelineChart from "@/components/charts/TimelineChart";
import PosterFrame from "@/components/charts/posters/PosterFrame";
import type { BrandCount, ChartLens } from "@/lib/charts/catalog";
import type { Lineup } from "@/lib/charts/lineup";
import type { TimelineEntry, TimelineYear } from "@/lib/charts/timeline";
import type { WeightTier } from "@/lib/charts/weight";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import type { ChartSelection } from "@/lib/url/charts";
import type { Mount } from "@/lib/types";

const LADDER_COLUMNS = 8;

interface PosterText {
  title: string;
  subtitle: string;
  cta: string;
  note: string;
  shareUrl: string;
}

function Frame({ text, children }: { text: PosterText; children: React.ReactNode }) {
  const t = useTranslations("Charts");
  return (
    <PosterFrame eyebrow={t("posterEyebrow")} {...text}>
      {children}
    </PosterFrame>
  );
}

export function TimelinePoster({
  text,
  mount,
  entries,
  years,
  brands,
  selection,
}: {
  text: PosterText;
  mount: Mount;
  entries: TimelineEntry[];
  years: TimelineYear[];
  brands: BrandCount[];
  selection: ChartSelection;
}) {
  return (
    <Frame text={text}>
      <TimelineChart mode={{ kind: "poster" }} mount={mount} entries={entries} years={years} brands={brands} initial={selection} />
    </Frame>
  );
}

export function LineupPoster({ text, lineup }: { text: PosterText; lineup: Lineup }) {
  return (
    <Frame text={text}>
      <LineupChart size="poster" lineup={lineup} />
    </Frame>
  );
}

/** The ladder as a long image: every tier, tiles in fixed columns, filtered like the page. */
export function WeightPoster({ text, tiers, matches }: { text: PosterText; tiers: WeightTier[]; matches: (lens: ChartLens) => boolean }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const heaviest = Math.max(...tiers.flatMap((tier) => tier.lenses.map((l) => l.weightG)));
  return (
    <Frame text={text}>
      <div className="flex flex-col" style={{ gap: 28 }}>
        {tiers.map((tier) => {
          const lenses = tier.lenses.filter(matches);
          return (
            <section key={tier.key} className="flex flex-col" style={{ gap: 12 }}>
              <div className="flex items-baseline border-b border-zinc-200" style={{ gap: 12, paddingBottom: 8 }}>
                <span className="font-heading font-bold" style={{ fontSize: 28 }}>
                  {t(`tier-${tier.key}`)}
                </span>
                <span className="text-zinc-500" style={{ fontSize: 16 }}>
                  {t(`tier-${tier.key}-tagline`)} · {t("lensCount", { count: lenses.length })}
                </span>
              </div>
              {lenses.length > 0 && (
                <div className="grid" style={{ gridTemplateColumns: `repeat(${LADDER_COLUMNS}, minmax(0, 1fr))`, gap: 10 }}>
                  {lenses.map((lens) => (
                    <div key={lens.id} className="flex flex-col" style={{ gap: 2 }}>
                      <Image src={getLensImageUrl(lens.id)} alt="" width={104} height={104} loading="eager" className="aspect-square w-full object-contain" />
                      <span className="truncate uppercase text-zinc-500" style={{ fontSize: 10, letterSpacing: "0.12em" }}>
                        {brandLabel(tBrand, lens.brand)}
                      </span>
                      <span className="line-clamp-2 text-zinc-900" style={{ fontSize: 12, lineHeight: "15px", minHeight: 30 }}>
                        {lens.model}
                      </span>
                      <span className="flex items-center" style={{ gap: 6 }}>
                        <span className="font-bold tabular-nums" style={{ fontSize: 14 }}>
                          {t("weight", { weight: lens.weightG })}
                        </span>
                        <span className="flex flex-1 overflow-hidden rounded bg-zinc-100" style={{ height: 4 }}>
                          <span className="rounded bg-zinc-900" style={{ width: `${Math.round(Math.sqrt(lens.weightG / heaviest) * 100)}%` }} />
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Frame>
  );
}
