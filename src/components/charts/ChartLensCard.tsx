"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { POPUP_SURFACE_CLS } from "@/config/ui-tokens";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import { focalEquivDisplay, type ChartLens } from "@/lib/charts/catalog";
import { cn } from "@/lib/utils";

/** Read-only details for the lens under the pointer; the lens itself links to its page. */
export default function ChartLensCard({
  lens,
  className,
  style,
}: {
  lens: ChartLens;
  className?: string;
  style?: React.CSSProperties;
}) {
  const tBrand = useTranslations("Brands");

  return (
    <div
      role="tooltip"
      className={cn(POPUP_SURFACE_CLS, "pointer-events-none flex w-72 items-center gap-3 p-3", className)}
      style={style}
    >
      <Image
        src={getLensImageUrl(lens.id)}
        alt=""
        width={80}
        height={80}
        className="size-20 shrink-0 object-contain"
        style={lensImageStyle}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{brandLabel(tBrand, lens.brand)}</span>
        <span className="text-sm font-semibold leading-snug text-zinc-900">{lens.model}</span>
        <ChartLensFacts lens={lens} className="text-xs" />
      </div>
    </div>
  );
}

// One fact group per line, so a fact never moves between lines with the card's width.
/** A lens's facts on fixed lines: equivalent focal length and weight, then the release year when known. */
export function ChartLensFacts({ lens, className }: { lens: ChartLens; className?: string }) {
  const t = useTranslations("Charts");
  const lines = [
    `${t("equivFocal", { focal: focalEquivDisplay(lens) })} · ${t("weight", { weight: lens.weightG })}`,
    lens.releaseYear ? t("released", { year: String(lens.releaseYear) }) : undefined,
  ];
  return (
    <span className={cn("flex flex-col whitespace-nowrap text-zinc-600", className)}>
      {lines.map((line) => line && <span key={line}>{line}</span>)}
    </span>
  );
}
