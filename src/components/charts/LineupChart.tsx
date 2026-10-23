"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ChartLensCard from "@/components/charts/ChartLensCard";
import ChartLensSheet from "@/components/charts/ChartLensSheet";
import { useChartCard } from "@/hooks/useChartCard";
import { apertureLabel, focalEquivDisplay, type ChartLens } from "@/lib/charts/catalog";
import type { Lineup } from "@/lib/charts/lineup";
import { logFrac, pct } from "@/lib/charts/scale";
import { focalRangeDisplay } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { lensPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

const ZOOM_TICKS = [10, 16, 23, 35, 56, 90, 135, 200, 400, 600];
const PHONE_ZOOM_TICKS = new Set([10, 23, 56, 135, 400]);
const CARD_WIDTH = 288;

// A poster is rasterized at a fixed width, so it takes the wide layout whatever the screen.
const SIZES = {
  responsive: {
    column: "w-[60px] md:w-[92px]",
    image: "size-12 md:size-[76px]",
    zoomAxis: "left-14 md:left-[84px]",
    zoomRow: "h-14 md:h-[88px]",
    zoomLabel: "bottom-[22px] md:bottom-9",
    zoomBar: "bottom-3 h-1.5 md:bottom-6 md:h-2",
    heading: "text-base",
    group: "px-2.5 py-3 md:px-6 md:pb-6 md:pt-5",
    narrowTick: "max-md:hidden",
    loading: "lazy",
  },
  poster: {
    column: "w-[92px]",
    image: "size-[76px]",
    zoomAxis: "left-[84px]",
    zoomRow: "h-[88px]",
    zoomLabel: "bottom-9",
    zoomBar: "bottom-6 h-2",
    heading: "text-lg",
    group: "px-6 pb-6 pt-5",
    narrowTick: "",
    loading: "eager",
  },
} as const;
const CARD_GAP = 12;
const LABEL_CLS = "text-[11px] tabular-nums text-zinc-600";

export default function LineupChart({ lineup, size }: { lineup: Lineup; size: keyof typeof SIZES }) {
  const cls = SIZES[size];
  const t = useTranslations("Charts");
  const container = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number; width?: number }>();
  const { active, itemHandlers, sheet } = useChartCard((el) => {
    const box = container.current?.getBoundingClientRect();
    if (!box) {
      return;
    }
    // A zoom row links across the whole width; place the card by its image.
    const item = (el.querySelector("img") ?? el).getBoundingClientRect();
    const x = item.left - box.left;
    const y = item.top - box.top;
    if (box.width < 2 * CARD_WIDTH) {
      setCardPos({ left: 0, top: y + item.height + 6, width: box.width });
    } else {
      const right = x + item.width + CARD_GAP;
      const left = right + CARD_WIDTH <= box.width ? right : x - CARD_GAP - CARD_WIDTH;
      setCardPos({ left: Math.max(0, Math.min(left, box.width - CARD_WIDTH)), top: y });
    }
  });

  const all = [...lineup.primes.flatMap((c) => c.lenses), ...lineup.zooms];
  const activeLens = all.find((l) => l.id === active);
  const sheetLens = all.find((l) => l.id === sheet.id);
  const spec = (lens: ChartLens) => [
    lens.releaseYear ? t("released", { year: String(lens.releaseYear) }) : undefined,
    t("equivFocal", { focal: focalEquivDisplay(lens) }),
    t("weight", { weight: lens.weightG }),
  ];

  const lo = Math.min(...lineup.zooms.map((l) => l.focalMin)) * 0.85;
  const hi = Math.max(...lineup.zooms.map((l) => l.focalMax)) * 1.08;
  const zx = (f: number) => logFrac(f, lo, hi);

  return (
    <div ref={container} className="relative flex flex-col gap-4">
      {lineup.primes.length > 0 && (
        <section className={cn("flex flex-col gap-4 rounded-2xl bg-zinc-50", cls.group)}>
          <SectionHead headingCls={cls.heading} label={t("lineupPrimes")} note={t("lineupPrimesNote", { count: lineup.primes.reduce((n, c) => n + c.lenses.length, 0) })} />
          <ul className="flex flex-wrap items-end gap-y-6">
            {lineup.primes.map((column) => (
              <li key={column.focal} className={cn("flex flex-col items-center", cls.column)}>
                <div className="flex flex-col-reverse items-center gap-1.5 pb-1.5">
                  {column.lenses.map((lens) => (
                    <Link
                      key={lens.id}
                      href={lensPath(lens)}
                      aria-label={lens.model}
                      {...itemHandlers(lens.id)}
                      className={cn("flex flex-col items-center gap-0.5 transition-transform", active === lens.id && "scale-110")}
                    >
                      <Image src={getLensImageUrl(lens.id)} alt="" width={76} height={76} loading={cls.loading} className={cn("object-contain drop-shadow-sm", cls.image)} />
                      {lens.aperture !== undefined && <span className={LABEL_CLS}>{apertureLabel(lens)}</span>}
                    </Link>
                  ))}
                </div>
                <span className="h-0.5 w-full bg-zinc-200" aria-hidden="true" />
                <span className="mt-2 text-xs font-semibold tabular-nums text-zinc-900">{column.focal}mm</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lineup.zooms.length > 0 && (
        <section className={cn("flex flex-col gap-4 rounded-2xl bg-zinc-50", cls.group)}>
          <SectionHead headingCls={cls.heading} label={t("lineupZooms")} note={t("lineupZoomsNote", { count: lineup.zooms.length })} />
          <div className="relative pt-6">
            <div className={cn("absolute inset-y-0 right-0", cls.zoomAxis)} aria-hidden="true">
              {ZOOM_TICKS.filter((f) => f > lo && f < hi).map((f) => (
                <div key={f} className={cn("absolute inset-y-0", !PHONE_ZOOM_TICKS.has(f) && cls.narrowTick)} style={{ left: pct(zx(f)) }}>
                  <span className="absolute top-0 w-12 -translate-x-1/2 text-center text-[11px] tabular-nums text-zinc-500">{f}mm</span>
                  <span className="absolute bottom-0 top-6 w-px bg-zinc-200/70" />
                </div>
              ))}
            </div>
            <ul className="relative">
              {lineup.zooms.map((lens) => (
                <li key={lens.id}>
                  <Link href={lensPath(lens)} aria-label={lens.model} {...itemHandlers(lens.id)} className={cn("flex items-center gap-2", cls.zoomRow)}>
                    <Image src={getLensImageUrl(lens.id)} alt="" width={76} height={76} loading={cls.loading} className={cn("shrink-0 object-contain drop-shadow-sm", cls.image)} />
                    <span className="relative h-full flex-1">
                      <span
                        className={cn("absolute whitespace-nowrap bg-zinc-50 pr-1", LABEL_CLS, cls.zoomLabel)}
                        style={zx(lens.focalMin) > 0.6 ? { right: pct(1 - zx(lens.focalMax)) } : { left: pct(zx(lens.focalMin)) }}
                      >
                        {[focalRangeDisplay(lens.focalMin, lens.focalMax), apertureLabel(lens)].filter(Boolean).join(" ")}
                      </span>
                      <span
                        className={cn("absolute rounded transition-colors", cls.zoomBar, active === lens.id ? "bg-zinc-900" : "bg-zinc-300")}
                        style={{ left: pct(zx(lens.focalMin)), width: pct(zx(lens.focalMax) - zx(lens.focalMin)) }}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {activeLens && cardPos && (
        <ChartLensCard
          lens={activeLens}
          spec={spec(activeLens)}
          className="absolute z-30"
          style={{ left: Math.round(cardPos.left), top: Math.round(cardPos.top), width: cardPos.width }}
        />
      )}
      <ChartLensSheet lens={sheetLens} spec={sheetLens ? spec(sheetLens) : []} open={sheet.open} onOpenChange={sheet.onOpenChange} />
    </div>
  );
}

function SectionHead({ label, note, headingCls }: { label: string; note: string; headingCls: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <h3 className={cn("font-semibold text-zinc-900", headingCls)}>{label}</h3>
      <span className="text-xs text-zinc-500">{note}</span>
    </div>
  );
}
