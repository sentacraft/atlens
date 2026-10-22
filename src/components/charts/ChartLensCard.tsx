"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { POPUP_SURFACE_CLS } from "@/config/ui-tokens";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { ChartLens } from "@/lib/charts/catalog";
import { cn } from "@/lib/utils";

/** Read-only details for the lens under the pointer; the lens itself links to its page. */
export default function ChartLensCard({
  lens,
  spec,
  className,
  style,
}: {
  lens: ChartLens;
  spec: string;
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
        <span className="text-xs text-zinc-600">{spec}</span>
      </div>
    </div>
  );
}
