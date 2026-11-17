"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { Dialog, DialogBackdrop, DialogClose, DialogPortal, DialogRawPopup, DialogTitle } from "@/components/ui/dialog";
import { ACTIVE_DOT_CLS, ICON_CLOSE_BTN_CLS, IMAGE_CONTROL_CLS } from "@/config/ui-tokens";
import { getLensGalleryImageIds, getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

type GalleryLabels = {
  images: string[];
  open: string;
  close: string;
  previous: string;
  next: string;
};

type CarouselApi = NonNullable<UseEmblaCarouselType[1]>;

const CAROUSEL_OPTIONS = {
  align: "start",
  loop: false,
  breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
} as const;

export default function LensImageGallery({
  lens, labels,
}: {
  lens: Pick<Lens, "id" | "model" | "images">;
  labels: GalleryLabels;
}) {
  const images = [undefined, ...getLensGalleryImageIds(lens)];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const multiple = images.length > 1;
  const [mainRef, mainApi] = useEmblaCarousel({ ...CAROUSEL_OPTIONS, watchDrag: multiple });
  const [viewerRef, viewerApi] = useEmblaCarousel({ ...CAROUSEL_OPTIONS, watchDrag: multiple });

  const setMainRef = useCallback((node: HTMLButtonElement | null) => {
    trigger.current = node;
    mainRef(node);
  }, [mainRef]);

  useEffect(() => {
    function onSelect(api: CarouselApi) {
      setIndex(api.selectedScrollSnap());
    }
    for (const api of [mainApi, viewerApi]) {
      api?.on("select", onSelect);
      api?.on("reInit", onSelect);
    }
    return () => {
      for (const api of [mainApi, viewerApi]) {
        api?.off("select", onSelect);
        api?.off("reInit", onSelect);
      }
    };
  }, [mainApi, viewerApi]);

  useEffect(() => {
    for (const api of [mainApi, viewerApi]) {
      if (api && api.selectedScrollSnap() !== index) {
        api.scrollTo(index, true);
      }
    }
  }, [mainApi, viewerApi, index]);

  function selectImage(nextIndex: number) {
    const next = Math.min(images.length - 1, Math.max(0, nextIndex));
    const api = open ? viewerApi : mainApi;
    if (api) {
      api.scrollTo(next);
    } else {
      setIndex(next);
    }
  }

  function thumbnails(className: string) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto overflow-y-hidden p-1 [scrollbar-width:none]", className)}>
        {images.map((id, i) => (
          <button
            key={id ?? "primary"}
            type="button"
            aria-label={labels.images[i]}
            aria-pressed={index === i}
            onClick={() => selectImage(i)}
            className="relative size-12 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 aria-pressed:border-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1"
          >
            <Image src={getLensImageUrl(lens.id, id)} alt="" fill sizes="48px" className="object-contain p-1" />
          </button>
        ))}
      </div>
    );
  }

  function navigation(className: string) {
    return (
      <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-between", className)}>
        <button type="button" aria-label={labels.previous} disabled={index === 0} onClick={() => selectImage(index - 1)} className={cn(IMAGE_CONTROL_CLS, "pointer-events-auto")}>
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label={labels.next} disabled={index === images.length - 1} onClick={() => selectImage(index + 1)} className={cn(IMAGE_CONTROL_CLS, "pointer-events-auto")}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
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
          onClick={() => setOpen(true)}
          className="relative block aspect-square w-full touch-pan-y touch-pinch-zoom overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70 p-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <div className="flex h-full">
            {images.map((id, i) => (
              <div key={id ?? "primary"} data-slot="gallery-slide" aria-hidden={index !== i} className="h-full min-w-0 shrink-0 basis-full p-8">
                <div className="relative h-full w-full">
                  <Image
                    src={getLensImageUrl(lens.id, id)}
                    alt={lens.model}
                    fill
                    sizes="192px"
                    style={lensImageStyle}
                    className="pointer-events-none object-contain"
                    preload={i === 0}
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
          <span className={cn(IMAGE_CONTROL_CLS, "absolute bottom-2.5 right-2.5")} aria-hidden="true">
            <Maximize className="size-4" />
          </span>
        </button>
        {multiple && navigation("hidden px-1 sm:flex")}
      </div>
      {multiple && (
        <>
          {thumbnails("mt-2 hidden sm:flex")}
          <div className="mt-1 flex justify-center sm:hidden">
            {images.map((id, i) => (
              <button
                key={id ?? "primary"}
                type="button"
                aria-label={labels.images[i]}
                aria-pressed={index === i}
                onClick={() => selectImage(i)}
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded focus-visible:outline-2"
              >
                <span className={cn("size-[7px] rounded-full", index === i ? ACTIVE_DOT_CLS : "bg-zinc-400")} />
              </button>
            ))}
          </div>
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen} responsive={false}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogRawPopup
            initialFocus={close}
            finalFocus={trigger}
            onKeyDown={event => {
              if (!multiple || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {return;}
              event.preventDefault();
              selectImage(index + (event.key === "ArrowLeft" ? -1 : 1));
            }}
            className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-white px-4 pb-[max(1rem,var(--safe-inset-bottom))] pt-[max(1rem,var(--safe-inset-top))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(668px,calc(100dvh-48px))] sm:w-[min(748px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:shadow-2xl"
          >
            <DialogTitle className="sr-only">{lens.model}</DialogTitle>
            <DialogClose ref={close} aria-label={labels.close} className={cn(ICON_CLOSE_BTN_CLS, "absolute right-3 top-[max(0.75rem,var(--safe-inset-top))] z-10 size-11 cursor-pointer border border-zinc-200 bg-white sm:top-3")}>
              <X className="size-5" />
            </DialogClose>
            <div className="relative min-h-0 flex-1">
              <div ref={viewerRef} data-slot="gallery-viewport" className="absolute inset-0 touch-pan-y touch-pinch-zoom overflow-hidden">
                <div className="flex h-full">
                  {images.map((id, i) => (
                    <div key={id ?? "primary"} data-slot="gallery-slide" aria-hidden={index !== i} className="h-full min-w-0 shrink-0 basis-full p-[clamp(2rem,8vmin,3.5rem)]">
                      <div className="relative h-full w-full">
                        <Image
                          src={getLensImageUrl(lens.id, id)}
                          alt={lens.model}
                          fill
                          sizes="(min-width: 640px) 596px, calc(100vw - 96px)"
                          loading={i === index ? "eager" : "lazy"}
                          className="pointer-events-none object-contain"
                          draggable={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {multiple && navigation("px-0 sm:px-1")}
            </div>
            {multiple && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <span aria-live="polite" className="text-xs tabular-nums text-zinc-500">{index + 1} / {images.length}</span>
                {thumbnails("max-w-full")}
              </div>
            )}
          </DialogRawPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
