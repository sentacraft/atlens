"use client";

import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ICON_CLOSE_BTN_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { Dialog, DialogClose, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { track } from "@/lib/analytics/analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLensImageUrl } from "@/lib/lens/image";
import { TECHNICAL_IMAGE_PREVIEW_LIMIT, technicalImageFilter, type TechnicalImageRole } from "@/lib/lens/technical-images";
import type { LensImageAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TechnicalImageSet {
  id: string;
  model: string;
  images: LensImageAsset[];
}

const IMAGE_FRAME = "relative isolate overflow-hidden";
const IMAGE_BUTTON = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2";

function TechnicalImage({ set, image, caption, preview = false }: {
  set: TechnicalImageSet;
  image: LensImageAsset;
  caption: string;
  preview?: boolean;
}) {
  const filter = technicalImageFilter(image.displayPreset);
  return (
    <Image
      src={getLensImageUrl(set.id, image.id)}
      alt={`${set.model} — ${caption}`}
      fill
      unoptimized
      sizes={preview ? "144px" : "(max-width: 639px) 100vw, 600px"}
      className="object-contain p-2"
      style={{ filter }}
    />
  );
}

function useViewer(surface: "detail" | "compare", role: TechnicalImageRole) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ index: number; version: number } | null>(null);
  const [open, setOpen] = useState(false);
  function show(event: MouseEvent<HTMLButtonElement>, index: number) {
    trigger.current = event.currentTarget;
    setSelection((previous) => ({ index, version: (previous?.version ?? 0) + 1 }));
    setOpen(true);
    track("optical_image_open", { surface, role });
  }
  return { trigger, selection, open, show, close: () => setOpen(false) };
}

export function InlineTechnicalImages({ set, role }: { set: TechnicalImageSet; role: TechnicalImageRole }) {
  const t = useTranslations("LensDetail.opticalImages");
  const viewer = useViewer("detail", role);
  const previewLimit = role === "mtf" ? TECHNICAL_IMAGE_PREVIEW_LIMIT : set.images.length;
  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {set.images.slice(0, previewLimit).map((image, index) => {
          const label = imageShortLabel(image) || t("imageNumber", { number: String(index + 1) });
          return (
            <figure key={image.id} className="w-36 max-w-full">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={t("openImage", { label })}
                onClick={(event) => viewer.show(event, index)}
                className={cn(IMAGE_FRAME, IMAGE_BUTTON, "block h-26 w-full rounded-lg border border-zinc-200 hover:border-zinc-400", image.displayPreset && "bg-white")}
              >
                <TechnicalImage set={set} image={image} caption={label} preview />
              </button>
              {role === "mtf" && <figcaption className="mt-1 text-[11px] leading-snug text-zinc-600 tabular-nums">{label}</figcaption>}
            </figure>
          );
        })}
      </div>
      {set.images.length > previewLimit && (
        <button type="button" aria-haspopup="dialog" onClick={(event) => viewer.show(event, previewLimit)} className={cn(TEXT_LINK_CLS, "mt-1 inline-flex min-h-11 items-center text-xs")}>
          {t("viewRemaining")}
        </button>
      )}
      {viewer.selection !== null && (
        <TechnicalViewer key={viewer.selection.version} open={viewer.open} role={role} sets={[set]} activeId={set.id} initialIndex={viewer.selection.index} close={viewer.close} trigger={viewer.trigger} />
      )}
    </>
  );
}

export function CompareTechnicalImages({ sets, activeId, role }: { sets: TechnicalImageSet[]; activeId: string; role: TechnicalImageRole }) {
  const t = useTranslations("LensDetail.opticalImages");
  const viewer = useViewer("compare", role);
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={(event) => viewer.show(event, 0)} className={cn(TEXT_LINK_CLS, "text-xs")}>
        {t(role === "mtf" ? "viewMtf" : "viewStructure")}
      </button>
      {viewer.selection !== null && (
        <TechnicalViewer key={viewer.selection.version} open={viewer.open} role={role} sets={sets} activeId={activeId} initialIndex={0} close={viewer.close} trigger={viewer.trigger} />
      )}
    </>
  );
}

function imageShortLabel(image: LensImageAsset) {
  return [
    image.focalLengthMm !== undefined ? `${image.focalLengthMm}mm` : undefined,
    image.spatialFrequency ? `${image.spatialFrequency.values.join(", ")} ${image.spatialFrequency.unit}` : undefined,
    image.apertureFNumbers?.map((n) => `f/${n}`).join(", "),
  ].filter(Boolean).join(" · ");
}

function TechnicalViewer({ open, role, sets, activeId, initialIndex, close, trigger }: {
  open: boolean;
  role: TechnicalImageRole;
  sets: TechnicalImageSet[];
  activeId: string;
  initialIndex: number;
  close: () => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("LensDetail.opticalImages");
  const [active, setActive] = useState(activeId);
  return (
    <Dialog open={open} onOpenChange={(open) => {if (!open) {close();}}}>
      <DialogPopup finalFocus={trigger} className={cn("max-h-[85dvh] overflow-y-auto sm:w-[calc(100%_-_2rem)]", sets.length > 1 && "sm:max-w-5xl")}>
        <DialogHeader className="relative">
          <DialogTitle>{t(role === "mtf" ? "mtf" : "structure")}</DialogTitle>
          <DialogClose className={cn(ICON_CLOSE_BTN_CLS, "absolute right-3 top-3 size-9")} aria-label={t("close")}><X className="size-4" /></DialogClose>
          {sets.length > 1 && role === "mtf" && <p className="text-sm text-zinc-600">{t("compareConditions")}</p>}
        </DialogHeader>
        {sets.length > 1 && (
          <div className="px-4 pb-3 sm:hidden">
            <ViewerSelect
              label={t("selectLens")}
              value={active}
              onChange={setActive}
              items={sets.map((set) => ({ value: set.id, label: set.model }))}
              className="w-full"
            />
          </div>
        )}
        <div className={cn("grid gap-4 px-4 pb-4", sets.length > 1 && "sm:grid-cols-2")}>
          {sets.map((set) => (
            <div key={set.id} className={cn("min-w-0", set.id !== active && "hidden sm:block")}>
              <ImagePanel set={set} initialIndex={set.id === activeId ? initialIndex : 0} compare={sets.length > 1} />
            </div>
          ))}
        </div>
      </DialogPopup>
    </Dialog>
  );
}

function ViewerSelect({ label, value, onChange, items, className }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
  className: string;
}) {
  return (
    <Select value={value} items={items} onValueChange={(value) => {if (value !== null) {onChange(value);}}}>
      <SelectTrigger aria-label={label} className={cn("max-w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function ImagePanel({ set, initialIndex, compare }: { set: TechnicalImageSet; initialIndex: number; compare: boolean }) {
  const t = useTranslations("LensDetail.opticalImages");
  const [index, setIndex] = useState(initialIndex);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const image = set.images[index];
  const label = imageShortLabel(image);
  const count = set.images.length;
  const multiple = count > 1;
  const description = label || t("imageNumber", { number: String(index + 1) });
  function move(offset: number) {
    setIndex((current) => Math.max(0, Math.min(count - 1, current + offset)));
  }
  function startSwipe(event: TouchEvent) {
    const point = event.touches[0];
    touch.current = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null;
  }
  function endSwipe(event: TouchEvent) {
    const start = touch.current;
    touch.current = null;
    const point = event.changedTouches[0];
    if (!start || !point) {return;}
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {move(dx < 0 ? 1 : -1);}
  }
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{set.model}</p>
        {multiple && compare && (
          <ViewerSelect
            label={t("selectImage", { lens: set.model })}
            value={String(index)}
            onChange={(value) => setIndex(Number(value))}
            items={set.images.map((item, position) => {
              const condition = imageShortLabel(item);
              const number = t("imageNumber", { number: String(position + 1) });
              return { value: String(position), label: condition ? `${number} · ${condition}` : number };
            })}
            className="text-xs"
          />
        )}
      </div>
      <div onTouchStart={multiple ? startSwipe : undefined} onTouchEnd={multiple ? endSwipe : undefined} onTouchCancel={() => {touch.current = null;}} className={cn(IMAGE_FRAME, "h-[min(36dvh,23rem)] touch-pan-y sm:h-[min(50dvh,27rem)]", image.displayPreset && "bg-white")}>
        <TechnicalImage set={set} image={image} caption={description} />
      </div>
      <figcaption className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600">
        <div className="min-w-0 flex-1" aria-live="polite">
          {multiple && <p className="tabular-nums">{index + 1} / {count}</p>}
          {label && <p className="font-medium text-zinc-900">{label}</p>}
          {image.mtfMethod && <p>{t(image.mtfMethod)}</p>}
          {image.depictedMount && <p>{t("mount", { mount: image.depictedMount })}</p>}
          {image.conditionsNote && <p>{image.conditionsNote}</p>}
        </div>
        {multiple && <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("previous")} className={cn(ICON_CLOSE_BTN_CLS, "size-11 disabled:opacity-35")}><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={() => move(1)} disabled={index === count - 1} aria-label={t("next")} className={cn(ICON_CLOSE_BTN_CLS, "size-11 disabled:opacity-35")}><ChevronRight className="size-4" /></button>
        </div>}
      </figcaption>
    </figure>
  );
}
