"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { DialogTitle } from "@/components/ui/dialog";
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
  return (
    <div role="tooltip" className={cn(POPUP_SURFACE_CLS, "pointer-events-none w-72 p-3", className)} style={style}>
      <ChartLensSummary lens={lens} size="card" />
    </div>
  );
}

const SUMMARY = {
  card: { image: 80, imageCls: "size-20", gap: "gap-3", model: "text-sm", facts: "text-xs" },
  sheet: { image: 88, imageCls: "size-22", gap: "gap-3.5", model: "text-base", facts: "text-[13px]" },
} as const;

/**
 * The lens's image, brand, model and facts, shared by the hover card and the tap sheet. Facts sit
 * on fixed lines so none moves between lines with the width; in the sheet the model titles the dialog.
 */
export function ChartLensSummary({ lens, size }: { lens: ChartLens; size: keyof typeof SUMMARY }) {
  const t = useTranslations("Charts");
  const tBrand = useTranslations("Brands");
  const cls = SUMMARY[size];
  const Model = size === "sheet" ? DialogTitle : "span";
  const facts = [
    `${t("equivFocal", { focal: focalEquivDisplay(lens) })} · ${t("weight", { weight: lens.weightG })}`,
    lens.releaseYear ? t("released", { year: String(lens.releaseYear) }) : undefined,
  ];
  return (
    <div className={cn("flex items-center", cls.gap)}>
      <Image
        src={getLensImageUrl(lens.id)}
        alt=""
        width={cls.image}
        height={cls.image}
        className={cn("shrink-0 object-contain", cls.imageCls)}
        style={lensImageStyle}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{brandLabel(tBrand, lens.brand)}</span>
        <Model className={cn("font-semibold leading-snug text-zinc-900", cls.model)}>{lens.model}</Model>
        <span className={cn("flex flex-col whitespace-nowrap text-zinc-600", cls.facts)}>
          {facts.map((line) => line && <span key={line}>{line}</span>)}
        </span>
      </div>
    </div>
  );
}
