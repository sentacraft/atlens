"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type GalleryImage = { src: string; label: string };

export default function GalleryThumbnails({ images, index, onSelect, className }: {
  images: GalleryImage[];
  index: number;
  onSelect: (index: number) => void;
  className?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const active = rail?.children[index];
    if (!rail || !active || !rail.scrollBy) {return;}
    const outer = rail.getBoundingClientRect();
    const inner = active.getBoundingClientRect();
    const left = inner.left < outer.left + 4 ? inner.left - outer.left - 4
      : inner.right > outer.right - 4 ? inner.right - outer.right + 4 : 0;
    if (left) {
      rail.scrollBy({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }, [index]);

  return (
    <div ref={railRef} data-slot="gallery-thumbnails" className={cn("flex max-w-full gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain p-1 [scrollbar-width:none]", className)}>
      {images.map((image, i) => (
        <button
          key={image.src}
          type="button"
          aria-label={image.label}
          aria-pressed={index === i}
          onClick={() => onSelect(i)}
          className="relative size-12 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-white aria-pressed:border-zinc-900 aria-pressed:ring-1 aria-pressed:ring-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1"
        >
          <Image src={image.src} alt="" fill sizes="48px" className="object-contain p-1" />
        </button>
      ))}
    </div>
  );
}
