"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ChartItemHandlers } from "@/hooks/useChartCard";
import type { ChartLens } from "@/lib/charts/catalog";
import { brandLabel } from "@/lib/lens/format";
import { lensPath } from "@/lib/url/routes";

/** A lens on a chart: a link carrying the chart's hover and tap handling, or a plain mark on a poster. */
export default function ChartLensItem({
  lens,
  handlers,
  focused,
  className,
  style,
  children,
}: {
  lens: ChartLens;
  /** Absent on a poster, which nobody can click. */
  handlers: ChartItemHandlers | undefined;
  /** The lens a link opened the chart on; `useScrollToFocused` finds it by this mark. */
  focused?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const tBrand = useTranslations("Brands");
  if (!handlers) {
    return (
      <span aria-hidden="true" data-focused={focused || undefined} className={className} style={style}>
        {children}
      </span>
    );
  }
  return (
    <Link
      href={lensPath(lens)}
      aria-label={`${brandLabel(tBrand, lens.brand)} ${lens.model}`}
      aria-current={focused || undefined}
      data-focused={focused || undefined}
      {...handlers}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
