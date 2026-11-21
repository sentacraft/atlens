import Image from "next/image";
import { technicalImageFilter } from "@/lib/lens/technical-images";
import type { LensImageDisplayPreset } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function LensImagePreview({ src, alt, preset, preview, sizes, className }: {
  src: string;
  alt: string;
  preset: LensImageDisplayPreset | undefined;
  preview: boolean;
  sizes: string;
  className: string;
}) {
  return (
    <Image src={src} alt={alt} fill unoptimized sizes={sizes}
      data-gallery-preview={preview || undefined}
      className={cn("object-contain", className)} style={{ filter: technicalImageFilter(preset) }} />
  );
}
