import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import WhenMountHas from "@/components/mount/WhenMountHas";
import { PAGE_GUTTER_CLS, PAGE_SECTION_HEADING_CLS, SECTION_HEADING_ROW_CLS, SECTION_VIEW_ALL_LINK_CLS } from "@/config/ui-tokens";
import type { ChartPreviews, FocalMark } from "@/lib/charts/previews";
import { logFrac } from "@/lib/charts/scale";
import { chartPath, chartsPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

const W = 300;
const H = 170;

function isPrime(mark: FocalMark) {
  return mark.focalMin === mark.focalMax;
}

/** Years across, focal length up: a dot per prime and a bar per zoom, as on the timeline chart. */
function TimelineSkeleton({ timeline, focalMin, focalMax }: Pick<ChartPreviews, "timeline" | "focalMin" | "focalMax">) {
  const years = Array.from({ length: timeline.last - timeline.first + 1 }, (_, i) => timeline.first + i);
  const plotH = H - 18;
  const colW = W / years.length;
  const y = (focal: number) => plotH * (1 - logFrac(focal, focalMin, focalMax));
  const labelled = new Set([timeline.first, Math.round((timeline.first + timeline.last) / 2), timeline.last]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      {years.map((year, i) => {
        const marks = timeline.marks.filter((mark) => mark.year === year);
        const x0 = i * colW;
        return (
          <g key={year}>
            {i % 2 === 0 && <rect x={x0} y={0} width={colW} height={plotH} className="fill-zinc-100" />}
            {marks.map((mark, j) => {
              const x = x0 + colW * (0.25 + (0.5 * j) / Math.max(marks.length - 1, 1));
              return isPrime(mark) ? (
                <circle key={j} cx={x} cy={y(mark.focalMin)} r={2.6} className="fill-zinc-500" />
              ) : (
                <rect key={j} x={x - 1.4} y={y(mark.focalMax)} width={2.8} height={Math.max(y(mark.focalMin) - y(mark.focalMax), 3)} rx={1.4} className="fill-zinc-400" />
              );
            })}
            {labelled.has(year) && (
              <text x={x0 + colW / 2} y={H - 4} textAnchor="middle" className="fill-zinc-500 text-[9px] max-sm:hidden">
                {year}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Heaviest at the top: a lens, its name and its weight bar per row, as on the weight ladder. */
function WeightSkeleton({ weight }: Pick<ChartPreviews, "weight">) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      {weight.sampleG.map((grams, i) => {
        const y = 8 + i * 18.5;
        return (
          <g key={i}>
            <circle cx={10} cy={y + 3} r={5} className="fill-zinc-400" />
            <rect x={22} y={y} width={44} height={6} rx={3} className="fill-zinc-200" />
            <rect x={74} y={y} width={Math.max(4, (210 * grams) / weight.heaviestG)} height={6} rx={3} className="fill-zinc-600" />
          </g>
        );
      })}
    </svg>
  );
}

/** One brand's lineup: primes stacked by focal length above, zooms as spans below, as on a brand page. */
function LineupSkeleton({ lineup, primesLabel, zoomsLabel }: { lineup: ChartPreviews["lineup"]; primesLabel: string; zoomsLabel: string }) {
  const focals = [...lineup.primes.map((column) => column.focal), ...lineup.zooms.flatMap((zoom) => [zoom.focalMin, zoom.focalMax])];
  const lo = Math.min(...focals);
  const hi = Math.max(...focals);
  const x = (focal: number) => 10 + 276 * logFrac(focal, lo, hi);
  const zoomStep = Math.min(3.1, 64 / Math.max(lineup.zooms.length, 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" aria-hidden="true">
      <text x={10} y={10} className="fill-zinc-500 text-[9px] max-sm:hidden">
        {primesLabel}
      </text>
      {lineup.primes.flatMap((column) =>
        Array.from({ length: column.count }, (_, k) => (
          <circle key={`${column.focal}-${k}`} cx={x(column.focal)} cy={70 - k * 9} r={3.4} className="fill-zinc-500" />
        )),
      )}
      <line x1={10} y1={78} x2={286} y2={78} className="stroke-zinc-200" />
      <text x={10} y={94} className="fill-zinc-500 text-[9px] max-sm:hidden">
        {zoomsLabel}
      </text>
      {lineup.zooms.map((zoom, i) => (
        <rect key={i} x={x(zoom.focalMin)} y={100 + i * zoomStep} width={x(zoom.focalMax) - x(zoom.focalMin)} height={zoomStep * 0.7} rx={1} className="fill-zinc-400" />
      ))}
    </svg>
  );
}

function ChartCard({ href, title, description, preview }: { href: string; title: string; description: string; preview: ReactNode }) {
  return (
    <Link
      href={href}
      className="grid h-full grid-cols-[8rem_1fr] items-center gap-3 rounded-2xl border border-zinc-200 p-2 transition-colors hover:border-zinc-400 sm:flex sm:flex-col sm:items-stretch sm:gap-0 sm:overflow-hidden sm:p-0"
    >
      <span className="block h-[5.75rem] rounded-lg bg-zinc-50 px-1.5 py-1.5 sm:h-48 sm:rounded-none sm:border-b sm:border-zinc-100 sm:bg-white sm:px-4 sm:py-3">{preview}</span>
      <span className="min-w-0 sm:px-4 sm:pt-3.5 sm:pb-4">
        <span className="block text-[15px] font-semibold text-zinc-900">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-zinc-500 sm:mt-1 sm:text-[13px] sm:leading-5">{description}</span>
      </span>
    </Link>
  );
}

/** The three charts on the home page, each drawn as its own layout with plain marks in place of lenses. */
export default function HomeCharts({ previews }: { previews: ChartPreviews }) {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");
  const tCharts = useTranslations("Charts");
  const { timeline, weight, lineup } = previews;
  const primeCount = lineup.primes.reduce((n, column) => n + column.count, 0);
  const cards = [
    {
      key: "timeline",
      href: chartPath("X", "timeline"),
      title: tCharts("tabTimeline"),
      description: t("chartsTimeline", { count: timeline.count, first: String(timeline.first), last: String(timeline.last) }),
      preview: <TimelineSkeleton timeline={timeline} focalMin={previews.focalMin} focalMax={previews.focalMax} />,
    },
    {
      key: "weight",
      href: chartPath("X", "weight"),
      title: tCharts("tabWeight"),
      description: t("chartsWeight", { count: weight.count, heaviest: String(weight.heaviestG), lightest: String(weight.lightestG) }),
      preview: <WeightSkeleton weight={weight} />,
    },
    {
      key: "lineups",
      href: chartPath("X", "lineups"),
      title: tCharts("tabLineup"),
      description: t("chartsLineups", { brands: lineup.brandCount }),
      preview: (
        <LineupSkeleton
          lineup={lineup}
          primesLabel={`${tCharts("lineupPrimes")} ${primeCount}`}
          zoomsLabel={`${tCharts("lineupZooms")} ${lineup.zooms.length}`}
        />
      ),
    },
  ];

  return (
    <WhenMountHas section="charts">
      <section aria-labelledby="home-charts-heading" className={`mx-auto w-full max-w-6xl ${PAGE_GUTTER_CLS}`}>
        <div className={cn(SECTION_HEADING_ROW_CLS, "mb-4 sm:mb-5")}>
          <h2 id="home-charts-heading" className={PAGE_SECTION_HEADING_CLS}>
            {tNav("charts")}
          </h2>
          <Link href={chartsPath("X")} className={SECTION_VIEW_ALL_LINK_CLS}>
            {t("chartsLink")} →
          </Link>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-5">
          {cards.map(({ key, ...card }) => (
            <li key={key}>
              <ChartCard {...card} />
            </li>
          ))}
        </ul>
      </section>
    </WhenMountHas>
  );
}
