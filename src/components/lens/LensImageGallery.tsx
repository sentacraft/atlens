"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LoaderCircle, Maximize } from "lucide-react";
import GalleryThumbnails from "./GalleryThumbnails";
import type { GalleryLabels } from "./LensImageViewer";
import { IMAGE_CONTROL_CLS } from "@/config/ui-tokens";
import { getLensGalleryImageIds, getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

const LensImageViewer = lazy(() => import("./LensImageViewer"));
const CAROUSEL_OPTIONS = {
  align: "start",
  loop: false,
  breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
} as const;

export default function LensImageGallery({ lens, labels }: {
  lens: Pick<Lens, "id" | "model" | "images">;
  labels: GalleryLabels;
}) {
  const images = [undefined, ...getLensGalleryImageIds(lens)];
  const items = images.map((id, i) => ({ src: getLensImageUrl(lens.id, id), label: labels.images[i] }));
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const multiple = images.length > 1;
  const [mainRef, mainApi] = useEmblaCarousel({ ...CAROUSEL_OPTIONS, watchDrag: multiple });
  const setMainRef = useCallback((node: HTMLButtonElement | null) => {
    trigger.current = node;
    mainRef(node);
  }, [mainRef]);

  useEffect(() => {
    if (!mainApi) {return;}
    const onSelect = () => setIndex(mainApi.selectedScrollSnap());
    mainApi.on("select", onSelect);
    mainApi.on("reInit", onSelect);
    return () => {
      mainApi.off("select", onSelect);
      mainApi.off("reInit", onSelect);
    };
  }, [mainApi]);

  useEffect(() => {
    if (mainApi && mainApi.selectedScrollSnap() !== index) {mainApi.scrollTo(index, true);}
  }, [mainApi, index]);

  function selectImage(next: number) {
    const selected = Math.min(images.length - 1, Math.max(0, next));
    if (mainApi) {mainApi.scrollTo(selected);} else {setIndex(selected);}
  }

  return (
    <>
      <div className="relative">
        <button
          ref={setMainRef}
          data-slot="gallery-viewport"
          type="button"
          aria-label={labels.open}
          aria-haspopup="dialog"
          aria-busy={loading}
          onClick={() => {setLoading(true);setOpen(true);}}
          className="relative block aspect-square w-full touch-pan-y touch-pinch-zoom overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70 p-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex h-full">
            {images.map((id, i) => (
              <div key={id ?? "primary"} data-slot="gallery-slide" aria-hidden={index !== i} className="h-full min-w-0 shrink-0 basis-full p-8">
                <div className="relative h-full w-full">
                  <Image src={items[i].src} alt={lens.model} fill sizes="192px" style={lensImageStyle} className="pointer-events-none object-contain" preload={i === 0} draggable={false} />
                </div>
              </div>
            ))}
          </div>
          {multiple && <span data-slot="gallery-count" className="absolute bottom-3 right-3 rounded-full border border-zinc-200 bg-white/95 px-2 py-0.5 text-[11px] leading-[18px] tabular-nums text-zinc-600 sm:hidden">{index + 1} / {images.length}</span>}
          <span className={cn(IMAGE_CONTROL_CLS, "absolute bottom-2.5 right-2.5", multiple && "max-sm:hidden")} aria-hidden="true">
            {loading ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : <Maximize className="size-4" />}
          </span>
        </button>
        {multiple && <div className="pointer-events-none absolute inset-0 hidden items-center justify-between px-1 sm:flex">
          <button type="button" aria-label={labels.previous} disabled={index === 0} onClick={() => selectImage(index - 1)} className={cn(IMAGE_CONTROL_CLS, "pointer-events-auto")}><ChevronLeft className="size-4" /></button>
          <button type="button" aria-label={labels.next} disabled={index === images.length - 1} onClick={() => selectImage(index + 1)} className={cn(IMAGE_CONTROL_CLS, "pointer-events-auto")}><ChevronRight className="size-4" /></button>
        </div>}
      </div>
      {multiple && <GalleryThumbnails images={items} index={index} onSelect={selectImage} className="mt-2 hidden sm:flex" />}
      {open && <Suspense fallback={<span role="status" className="sr-only">{labels.loading}</span>}>
        <LensImageViewer
          images={items}
          initialIndex={index}
          title={lens.model}
          labels={labels}
          trigger={trigger}
          onChange={setIndex}
          onReady={() => setLoading(false)}
          onClose={() => {setOpen(false);setLoading(false);}}
        />
      </Suspense>}
    </>
  );
}
