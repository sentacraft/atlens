"use client";

import Image from "next/image";
import OwnedLensMark from "@/components/lens/OwnedLensMark";
import { getLensImageUrl } from "@/lib/lens/image";
import { cn } from "@/lib/utils";

/**
 * A lens's image on a chart. The owned dot sits on interactive charts only: a poster is a shared image
 * that must not carry the viewer's gear.
 */
export default function ChartLensThumb({
  lensId,
  size,
  interactive,
  loading,
  className,
  imageClassName,
}: {
  lensId: string;
  /** Pixel size the image is requested at; the box itself is sized by `className`. */
  size: number;
  interactive: boolean;
  loading: "lazy" | "eager";
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span className={cn("relative block shrink-0", className)}>
      <Image src={getLensImageUrl(lensId)} alt="" width={size} height={size} loading={loading} className={cn("size-full object-contain", imageClassName)} />
      {interactive && <OwnedLensMark lensId={lensId} form="dot" />}
    </span>
  );
}
