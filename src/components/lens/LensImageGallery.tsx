"use client";

import { useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { Dialog, DialogBackdrop, DialogClose, DialogPortal, DialogRawPopup, DialogTitle } from "@/components/ui/dialog";
import { ACTION_OUTLINE_CLS, ICON_CLOSE_BTN_CLS } from "@/config/ui-tokens";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

type GalleryLabels = {
  images: string[];
  open: string;
  close: string;
  previous: string;
  next: string;
};

export default function LensImageGallery({
  lens, labels,
}: {
  lens: Pick<Lens, "id" | "model" | "alternateImages">;
  labels: GalleryLabels;
}) {
  const images = [undefined, ...(lens.alternateImages ?? [])];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const lastSwipe = useRef(0);
  const multiple = images.length > 1;
  const currentSrc = getLensImageUrl(lens.id, images[index]);

  function step(direction: number) {
    setIndex(current => Math.min(images.length - 1, Math.max(0, current + direction)));
  }

  function startTouch(event: TouchEvent) {
    lastSwipe.current = 0;
    const touch = event.touches[0];
    touchOrigin.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function endTouch(event: TouchEvent) {
    const origin = touchOrigin.current;
    const touch = event.changedTouches[0];
    touchOrigin.current = null;
    if (!origin || !touch) {return;}
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy)) {return;}
    lastSwipe.current = Date.now();
    step(dx < 0 ? 1 : -1);
  }

  const swipe = multiple ? {
    onTouchStart: startTouch,
    onTouchEnd: endTouch,
    onTouchCancel: () => { touchOrigin.current = null; },
  } : {};

  function thumbnails(className: string) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto overflow-y-hidden p-1 [scrollbar-width:none]", className)}>
        {images.map((id, i) => (
          <button
            key={id ?? "primary"}
            type="button"
            aria-label={labels.images[i]}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
            className="relative size-12 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 aria-pressed:border-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1"
          >
            <Image src={getLensImageUrl(lens.id, id)} alt="" fill sizes="48px" className="object-contain" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={labels.open}
        aria-haspopup="dialog"
        {...swipe}
        onClick={event => {
          if (event.detail === 0 || Date.now() - lastSwipe.current > 350) {setOpen(true);}
        }}
        className="relative flex aspect-square w-full touch-pan-y cursor-zoom-in items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="relative aspect-square w-full">
          <Image
            src={currentSrc}
            alt={lens.model}
            fill
            sizes="256px"
            style={lensImageStyle}
            className="pointer-events-none object-contain"
            preload={index === 0}
            draggable={false}
          />
        </span>
        <span className={cn(ACTION_OUTLINE_CLS, "absolute bottom-2.5 right-2.5 size-10 justify-center px-0")} aria-hidden="true">
          <Maximize className="size-4" />
        </span>
      </button>
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
                onClick={() => setIndex(i)}
                className="group grid h-9 w-4 cursor-pointer place-items-center rounded focus-visible:outline-2"
              >
                <span className="size-[7px] rounded-full bg-zinc-400 group-aria-pressed:bg-zinc-900" />
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
              step(event.key === "ArrowLeft" ? -1 : 1);
            }}
            className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-white px-4 pb-[max(1rem,var(--safe-inset-bottom))] pt-[max(1rem,var(--safe-inset-top))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(668px,calc(100dvh-48px))] sm:w-[min(748px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:shadow-2xl"
          >
            <DialogTitle className="sr-only">{lens.model}</DialogTitle>
            <DialogClose ref={close} aria-label={labels.close} className={cn(ICON_CLOSE_BTN_CLS, "absolute right-3 top-[max(0.75rem,var(--safe-inset-top))] z-10 size-11 cursor-pointer rounded-lg border border-zinc-200 bg-white sm:top-3")}>
              <X className="size-5" />
            </DialogClose>
            <div className="flex min-h-0 flex-1 flex-col justify-center pt-11">
              <div {...swipe} className="relative mx-auto aspect-square max-h-full w-full touch-pan-y rounded-xl border border-zinc-100 bg-zinc-50 sm:aspect-auto sm:h-full">
                <Image
                  src={currentSrc}
                  alt={lens.model}
                  fill
                  sizes="(min-width: 640px) 708px, calc(100vw - 32px)"
                  loading="eager"
                  className="pointer-events-none object-contain"
                  draggable={false}
                />
                {multiple && (
                  <>
                    <button type="button" aria-label={labels.previous} disabled={index === 0} onClick={() => step(-1)} className={cn(ACTION_OUTLINE_CLS, "absolute left-2.5 top-1/2 size-11 -translate-y-1/2 justify-center px-0 disabled:opacity-40")}>
                      <ChevronLeft className="size-5" />
                    </button>
                    <button type="button" aria-label={labels.next} disabled={index === images.length - 1} onClick={() => step(1)} className={cn(ACTION_OUTLINE_CLS, "absolute right-2.5 top-1/2 size-11 -translate-y-1/2 justify-center px-0 disabled:opacity-40")}>
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
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
