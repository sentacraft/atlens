"use client";

import { useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
import { Dialog, DialogBackdrop, DialogClose, DialogPortal, DialogRawPopup, DialogTitle } from "@/components/ui/dialog";
import { ACTIVE_DOT_CLS, ICON_CLOSE_BTN_CLS, ICON_NAV_BTN_CLS } from "@/config/ui-tokens";
import { getLensImageUrl } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONTROL_CLS = cn(ICON_NAV_BTN_CLS,
  "size-11 rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-500 disabled:active:bg-transparent disabled:active:text-zinc-500");

type PreviewLens = Pick<Lens, "id" | "model" | "alternateImages">;

export default function GalleryCandidate({ lens }: { lens: PreviewLens }) {
  const images = [undefined, ...(lens.alternateImages ?? [])];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const lastSwipe = useRef(0);
  const multiple = images.length > 1;
  const src = getLensImageUrl(lens.id, images[index]);

  function step(direction: number) {
    setIndex(current => Math.min(images.length - 1, Math.max(0, current + direction)));
  }

  function startTouch(event: TouchEvent) {
    const touch = event.touches[0];
    origin.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function endTouch(event: TouchEvent) {
    const start = origin.current;
    const end = event.changedTouches[0];
    origin.current = null;
    if (!start || !end) {return;}
    const dx = end.clientX - start.x;
    if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(end.clientY - start.y)) {return;}
    lastSwipe.current = Date.now();
    step(dx < 0 ? 1 : -1);
  }

  const swipe = multiple ? { onTouchStart: startTouch, onTouchEnd: endTouch, onTouchCancel: () => { origin.current = null; } } : {};

  function navigation(className: string) {
    return (
      <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-between", className)}>
        <button type="button" aria-label="Previous preview image" disabled={index === 0} onClick={() => step(-1)} className={cn(CONTROL_CLS, "pointer-events-auto")}><ChevronLeft className="size-4" /></button>
        <button type="button" aria-label="Next preview image" disabled={index === images.length - 1} onClick={() => step(1)} className={cn(CONTROL_CLS, "pointer-events-auto")}><ChevronRight className="size-4" /></button>
      </div>
    );
  }

  function thumbnails(className: string) {
    return (
      <div className={cn("flex gap-2 overflow-x-auto p-1", className)}>
        {images.map((id, i) => (
          <button key={id ?? "primary"} type="button" aria-label={`Preview image ${i + 1}`} aria-pressed={index === i} onClick={() => setIndex(i)} className="relative size-12 shrink-0 cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 aria-pressed:border-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1">
            <Image src={getLensImageUrl(lens.id, id)} alt="" fill sizes="48px" className="object-contain p-1" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <button ref={trigger} type="button" aria-label="Enlarge preview image" aria-haspopup="dialog" {...swipe} onClick={event => { if (event.detail === 0 || Date.now() - lastSwipe.current > 350) {setOpen(true);} }} className="relative flex aspect-square w-full touch-pan-y touch-pinch-zoom cursor-zoom-in items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50/70 p-8 focus-visible:outline-2 focus-visible:outline-offset-2">
          <span className="relative aspect-square w-full"><Image src={src} alt={lens.model} fill sizes="192px" className="pointer-events-none object-contain" draggable={false} /></span>
          <span aria-hidden="true" className={cn(CONTROL_CLS, "absolute bottom-2.5 right-2.5")}><Maximize className="size-4" /></span>
        </button>
        {multiple && navigation("hidden px-1 sm:flex")}
      </div>
      {multiple && (
        <>
          {thumbnails("mt-2 hidden sm:flex")}
          <div className="mt-1 flex justify-center sm:hidden">
            {images.map((id, i) => <button key={id ?? "primary"} type="button" aria-label={`Preview image ${i + 1}`} aria-pressed={index === i} onClick={() => setIndex(i)} className="grid size-11 cursor-pointer place-items-center rounded focus-visible:outline-2"><span className={cn("size-[7px] rounded-full", index === i ? ACTIVE_DOT_CLS : "bg-zinc-400")} /></button>)}
          </div>
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen} responsive={false}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogRawPopup initialFocus={close} finalFocus={trigger} onKeyDown={event => {
            if (!multiple || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) {return;}
            event.preventDefault();
            step(event.key === "ArrowLeft" ? -1 : 1);
          }} className="fixed inset-0 flex h-dvh flex-col overflow-hidden bg-white px-4 pb-[max(1rem,var(--safe-inset-bottom))] pt-[max(1rem,var(--safe-inset-top))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(668px,calc(100dvh-48px))] sm:w-[min(748px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-5 sm:shadow-2xl">
            <DialogTitle className="sr-only">{lens.model} — proposed viewer</DialogTitle>
            <DialogClose ref={close} aria-label="Close preview viewer" className={cn(ICON_CLOSE_BTN_CLS, "absolute right-3 top-[max(0.75rem,var(--safe-inset-top))] z-10 size-11 cursor-pointer border border-zinc-200 bg-white sm:top-3")}><X className="size-5" /></DialogClose>
            <div {...swipe} className="relative min-h-0 flex-1 touch-pan-y touch-pinch-zoom">
              <div className="absolute inset-0 p-[clamp(2rem,8vmin,3.5rem)]"><div className="relative h-full w-full"><Image src={src} alt={lens.model} fill sizes="(min-width: 640px) 596px, calc(100vw - 96px)" className="pointer-events-none object-contain" draggable={false} /></div></div>
              {multiple && navigation("px-0 sm:px-1")}
            </div>
            {multiple && <div className="mt-3 flex flex-col items-center gap-1"><span aria-live="polite" className="text-xs tabular-nums text-zinc-500">{index + 1} / {images.length}</span>{thumbnails("max-w-full")}</div>}
          </DialogRawPopup>
        </DialogPortal>
      </Dialog>
    </>
  );
}
