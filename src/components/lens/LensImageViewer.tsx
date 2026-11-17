"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import PhotoSwipe, { type SlideData } from "photoswipe";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import GalleryThumbnails, { type GalleryImage } from "./GalleryThumbnails";
import { ICON_CLOSE_BTN_CLS, IMAGE_CONTROL_CLS } from "@/config/ui-tokens";
import { loadGalleryImage } from "@/lib/lens/gallery-image";
import { cn } from "@/lib/utils";
import "photoswipe/style.css";
import "./lens-image-viewer.css";

export type GalleryLabels = {
  images: string[];
  open: string;
  close: string;
  previous: string;
  next: string;
  zoom: string;
  loading: string;
  error: string;
  hint: { mouse: string; touch: string; mouseSingle: string; touchSingle: string };
};

type Props = {
  images: GalleryImage[];
  initialIndex: number;
  title: string;
  labels: GalleryLabels;
  trigger: RefObject<HTMLButtonElement | null>;
  onChange: (index: number) => void;
  onClose: () => void;
  onReady: () => void;
};

export default function LensImageViewer(props: Props) {
  const [initial] = useState(props);
  const [chrome, setChrome] = useState<HTMLElement | null>(null);
  const [index, setIndex] = useState(initial.initialIndex);
  const [controls, setControls] = useState(true);
  const [touch, setTouch] = useState(false);
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const titleId = useId();

  useEffect(() => {
    let cancelled = false;
    let opening = true;
    const pending = new Set<number>();
    let unlock: (() => void) | undefined;
    const data: SlideData[] = initial.images.map(image => ({ src: image.src, alt: initial.title, width: 0, height: 0 }));
    const loads = initial.images.map((image, i) => loadGalleryImage(image.src).then(size => {
      Object.assign(data[i], size.width ? size : { width: 1, height: 1 });
      if (!cancelled && pswpRef.current && size.width) {
        if (opening) {pending.add(i);} else {pswpRef.current.refreshSlideContent(i);}
      }
      return size;
    }));

    void loads[initial.initialIndex].then(size => {
      if (cancelled) {return;}
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      const toggleControls = () => setControls(visible => !visible);
      const pswp = new PhotoSwipe({
        dataSource: data,
        index: initial.initialIndex,
        mainClass: "lens-image-viewer",
        loop: false,
        close: false,
        zoom: false,
        counter: false,
        arrowPrev: false,
        arrowNext: false,
        bgOpacity: 1,
        showHideAnimationType: reducedMotion || !size.width ? "fade" : "zoom",
        showAnimationDuration: reducedMotion ? 80 : 240,
        hideAnimationDuration: reducedMotion ? 80 : 240,
        zoomAnimationDuration: reducedMotion ? 0 : 240,
        easing: "cubic-bezier(.2,.7,.2,1)",
        initialZoomLevel: "fit",
        secondaryZoomLevel: level => level.fit * 2,
        maxZoomLevel: level => level.fit * 4,
        imageClickAction: "zoom",
        bgClickAction: false,
        tapAction: toggleControls,
        doubleTapAction: "zoom",
        closeOnVerticalDrag: true,
        pinchToClose: false,
        allowPanToNext: false,
        trapFocus: true,
        returnFocus: false,
        errorMsg: initial.labels.error,
        paddingFn: viewport => {
          const mobile = viewport.x < 640;
          const probe = document.createElement("div");
          probe.style.cssText = "position:absolute;visibility:hidden;padding-top:var(--safe-inset-top);padding-bottom:var(--safe-inset-bottom)";
          document.body.appendChild(probe);
          const css = getComputedStyle(probe);
          const topInset = parseFloat(css.paddingTop) || 0;
          const bottomInset = parseFloat(css.paddingBottom) || 0;
          probe.remove();
          const x = mobile ? 16 : Math.max(24, (viewport.x - 748) / 2) + 52;
          const y = mobile ? 0 : Math.max(24, (viewport.y - 668) / 2);
          return { left: x, right: x, top: y + 76 + topInset, bottom: y + 148 + bottomInset };
        },
      });
      pswpRef.current = pswp;
      pswp.addFilter("thumbEl", () => initial.trigger.current!.querySelector<HTMLImageElement>('[aria-hidden="false"] img') ?? initial.trigger.current!);
      pswp.addFilter("thumbBounds", (bounds, item) => {
        const image = initial.trigger.current?.querySelector<HTMLImageElement>('[aria-hidden="false"] img');
        if (!image || !item.width || !item.height) {return bounds!;}
        const rect = image.getBoundingClientRect();
        const scale = Math.min(rect.width / item.width, rect.height / item.height);
        return { x: rect.left + (rect.width - item.width * scale) / 2, y: rect.top + (rect.height - item.height * scale) / 2, w: item.width * scale };
      });
      pswp.addFilter("placeholderSrc", () => initial.trigger.current?.querySelector<HTMLImageElement>('[aria-hidden="false"] img')?.currentSrc ?? false);
      pswp.on("uiRegister", () => {
        pswp.ui?.registerElement({ name: "gallery-chrome", appendTo: "root", onInit: element => setChrome(element) });
      });
      pswp.on("loadComplete", ({ content }) => {
        const image = content.element;
        if (image instanceof HTMLImageElement && image.naturalWidth && (data[content.index].width !== image.naturalWidth || data[content.index].height !== image.naturalHeight)) {
          Object.assign(data[content.index], { width: image.naturalWidth, height: image.naturalHeight });
          if (opening) {pending.add(content.index);} else {pswp.refreshSlideContent(content.index);}
        }
      });
      pswp.on("change", () => {
        setIndex(pswp.currIndex);
        setControls(true);
        initial.onChange(pswp.currIndex);
      });
      pswp.on("openingAnimationEnd", () => {
        opening = false;
        pswp.element?.classList.add("gallery-settled");
        for (const i of pending) {pswp.refreshSlideContent(i);}
        pending.clear();
      });
      pswp.on("closingAnimationStart", () => {
        pswp.element?.classList.remove("gallery-settled");
        pswp.element?.classList.add("gallery-closing");
      });
      pswp.on("pointerDown", ({ originalEvent }) => {
        const isTouch = originalEvent.pointerType !== "mouse";
        setTouch(isTouch);
        if (!isTouch) {setControls(true);}
      });
      pswp.on("keydown", () => {setTouch(false);setControls(true);});
      pswp.on("destroy", () => {
        pswpRef.current = null;
        unlock?.();
        unlock = undefined;
        if (!cancelled) {
          initial.trigger.current?.focus({ preventScroll: true });
          initial.onClose();
        }
      });
      const body = document.body;
      const root = document.documentElement;
      const rootOverflow = root.style.overflow;
      const overflow = body.style.overflow;
      const paddingRight = body.style.paddingRight;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbar > 0) {body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;}
      body.style.overflow = "hidden";
      root.style.overflow = "hidden";
      unlock = () => {root.style.overflow = rootOverflow;body.style.overflow = overflow;body.style.paddingRight = paddingRight;};
      pswp.init();
      const background = [...body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element !== pswp.element && !element.inert);
      for (const element of background) {element.inert = true;}
      const restoreScroll = unlock;
      unlock = () => {restoreScroll?.();for (const element of background) {element.inert = false;}};
      pswp.element?.setAttribute("aria-label", initial.title);
      pswp.element?.setAttribute("aria-labelledby", titleId);
      pswp.element?.setAttribute("aria-modal", "true");
      initial.onReady();
    });

    return () => {
      cancelled = true;
      if (pswpRef.current) {
        // destroy() otherwise delegates to close(), which ignores a gallery still opening.
        // https://github.com/dimsemenov/PhotoSwipe/blob/v5.4.4/src/js/photoswipe.js#L495-L519
        pswpRef.current.isDestroying = true;
        pswpRef.current.destroy();
      }
      pswpRef.current = null;
      unlock?.();
    };
  }, [initial, titleId]);

  if (!chrome) {return <span role="status" className="sr-only">{initial.labels.loading}</span>;}
  const multiple = initial.images.length > 1;
  const hint = touch
    ? initial.labels.hint[multiple ? "touch" : "touchSingle"]
    : initial.labels.hint[multiple ? "mouse" : "mouseSingle"];
  return createPortal(
    <div data-slot="gallery-controls" className={cn("gallery-controls", !controls && "gallery-controls-hidden")} inert={!controls}>
      <div className="gallery-header">
        <h2 id={titleId} className="min-w-0 truncate text-sm font-medium text-zinc-700 max-sm:text-xs">{initial.title}</h2>
        <div className="flex shrink-0 items-center">
          <button type="button" aria-label={initial.labels.zoom} onClick={() => pswpRef.current?.toggleZoom()} className={cn(IMAGE_CONTROL_CLS, "sm:hidden")}><ZoomIn className="size-4" /></button>
          <button type="button" aria-label={initial.labels.close} onClick={() => pswpRef.current?.close()} className={cn(ICON_CLOSE_BTN_CLS, "size-11 cursor-pointer")}><X className="size-5" /></button>
        </div>
      </div>
      <div className="gallery-footer">
        {multiple && <>
          <div className="flex items-center gap-3">
            <button type="button" aria-label={initial.labels.previous} disabled={index === 0} onClick={() => pswpRef.current?.prev()} className={IMAGE_CONTROL_CLS}><ChevronLeft className="size-4" /></button>
            <span aria-live="polite" className="text-xs tabular-nums text-zinc-500">{index + 1} / {initial.images.length}</span>
            <button type="button" aria-label={initial.labels.next} disabled={index === initial.images.length - 1} onClick={() => pswpRef.current?.next()} className={IMAGE_CONTROL_CLS}><ChevronRight className="size-4" /></button>
          </div>
          <GalleryThumbnails images={initial.images} index={index} onSelect={i => pswpRef.current?.goTo(i)} />
        </>}
        <p className="text-center text-[11px] leading-4 text-zinc-500">{hint}</p>
      </div>
    </div>, chrome,
  );
}
