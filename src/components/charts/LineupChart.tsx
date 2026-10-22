"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ChartLensCard from "@/components/charts/ChartLensCard";
import { useChartCard } from "@/hooks/useChartCard";
import type { ChartLens } from "@/lib/charts/catalog";
import type { Lineup } from "@/lib/charts/lineup";
import { logFrac, pct } from "@/lib/charts/scale";
import { focalRangeDisplay } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { lensPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

const ZOOM_TICKS = [10, 15, 24, 35, 50, 85, 135, 200, 300, 450, 600, 900];
const PHONE_ZOOM_TICKS = new Set([15, 35, 85, 200, 600]);
const CARD_WIDTH = 288;
const CARD_GAP = 12;

export default function LineupChart({ lineup }: { lineup: Lineup }) {
  const t = useTranslations("Charts");
  const container = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number; width?: number }>();
  const { active, itemHandlers } = useChartCard((el) => {
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
  const spec = (lens: ChartLens) =>
    [
      lens.releaseYear ? t("released", { year: String(lens.releaseYear) }) : undefined,
      t("equivFocal", { focal: focalRangeDisplay(lens.focalMin, lens.focalMax) }),
      t("weight", { weight: lens.weightG }),
    ]
      .filter(Boolean)
      .join(" · ");

  const lo = Math.min(...lineup.zooms.map((l) => l.focalMin)) * 0.85;
  const hi = Math.max(...lineup.zooms.map((l) => l.focalMax)) * 1.08;
  const zx = (f: number) => logFrac(f, lo, hi);

  return (
    <div ref={container} className="relative flex flex-col gap-10">
      {lineup.primes.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHead label={t("lineupPrimes")} note={t("lineupPrimesNote", { count: lineup.primes.reduce((n, c) => n + c.lenses.length, 0) })} />
          <ul className="flex flex-wrap items-end gap-y-6">
            {lineup.primes.map((column) => (
              <li key={column.focal} className="flex w-16 flex-col items-center md:w-[92px]">
                <div className="flex flex-col-reverse items-center gap-1.5 pb-1.5">
                  {column.lenses.map((lens) => (
                    <Link
                      key={lens.id}
                      href={lensPath(lens)}
                      aria-label={lens.model}
                      {...itemHandlers(lens.id)}
                      className={cn("flex flex-col items-center gap-0.5 transition-transform", active === lens.id && "scale-110")}
                    >
                      <Image src={getLensImageUrl(lens.id)} alt="" width={76} height={76} className="size-12 object-contain drop-shadow-sm md:size-[76px]" />
                      {lens.aperture !== undefined && <span className="text-[11px] tabular-nums text-zinc-600">F{lens.aperture}</span>}
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
        <section className="flex flex-col gap-4">
          <SectionHead label={t("lineupZooms")} note={t("lineupZoomsNote", { count: lineup.zooms.length })} />
          <div className="relative pt-6">
            <div className="absolute inset-y-0 left-14 right-0 md:left-[84px]" aria-hidden="true">
              {ZOOM_TICKS.filter((f) => f > lo && f < hi).map((f) => (
                <div key={f} className={cn("absolute inset-y-0", !PHONE_ZOOM_TICKS.has(f) && "max-md:hidden")} style={{ left: pct(zx(f)) }}>
                  <span className="absolute top-0 w-12 -translate-x-1/2 text-center text-[11px] tabular-nums text-zinc-500">{f}mm</span>
                  <span className="absolute bottom-0 top-6 w-px bg-zinc-100" />
                </div>
              ))}
            </div>
            <ul className="relative">
              {lineup.zooms.map((lens) => (
                <li key={lens.id}>
                  <Link href={lensPath(lens)} aria-label={lens.model} {...itemHandlers(lens.id)} className="flex h-14 items-center gap-2 md:h-[88px]">
                    <Image src={getLensImageUrl(lens.id)} alt="" width={76} height={76} className="size-12 shrink-0 object-contain drop-shadow-sm md:size-[76px]" />
                    <span className="relative h-full flex-1">
                      <span className="absolute inset-x-0 top-2 truncate text-xs text-zinc-700 md:top-5 md:text-sm">{lens.model}</span>
                      <span
                        className={cn("absolute bottom-3 h-1.5 rounded transition-colors md:bottom-6 md:h-2", active === lens.id ? "bg-zinc-900" : "bg-zinc-300")}
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
    </div>
  );
}

function SectionHead({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 border-b border-zinc-200 pb-1.5">
      <h2 className="font-heading text-lg font-bold text-zinc-900 md:text-xl">{label}</h2>
      <span className="text-xs text-zinc-500">{note}</span>
    </div>
  );
}
