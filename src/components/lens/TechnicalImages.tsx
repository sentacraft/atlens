"use client";

import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import LensImagePreview from "./LensImagePreview";
import LocalizedLensImageViewer from "./LocalizedLensImageViewer";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ICON_CLOSE_BTN_CLS, IMAGE_CONTROL_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { Dialog, DialogClose, DialogHeader, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { track } from "@/lib/analytics/analytics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLensImageUrl } from "@/lib/lens/image";
import { getTechnicalImageConditions, getTechnicalImageReadingNote, TECHNICAL_IMAGE_PREVIEW_LIMIT, technicalImageFilter, technicalImageShortLabel, type TechnicalImageRole } from "@/lib/lens/technical-images";
import type { LensImageAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TechnicalImageSet {
  id: string;
  model: string;
  images: LensImageAsset[];
}

const IMAGE_FRAME = "relative isolate overflow-hidden";
const IMAGE_BUTTON = "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2";

function technicalImageAlt(t: ReturnType<typeof useTranslations<"LensDetail">>, model: string, image: LensImageAsset) {
  const label = technicalImageShortLabel(image);
  return t("opticalImages.imageAlt", { model, role: image.role, conditions: label ? ` — ${label}` : "" });
}

function TechnicalImage({ set, image, preview = false }: {
  set: TechnicalImageSet;
  image: LensImageAsset;
  preview?: boolean;
}) {
  const t = useTranslations("LensDetail");
  return (
    <LensImagePreview
      src={getLensImageUrl(set.id, image.id)}
      alt={technicalImageAlt(t, set.model, image)}
      preset={image.displayPreset}
      preview={preview}
      sizes={preview ? "144px" : "(max-width: 639px) 100vw, 600px"}
      className="p-2"
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
          const label = technicalImageShortLabel(image) || t("imageNumber", { number: String(index + 1) });
          return (
            <figure key={image.id} className="w-36 max-w-full">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={t("openImage", { label })}
                onClick={(event) => viewer.show(event, index)}
                className={cn(IMAGE_FRAME, IMAGE_BUTTON, "block h-26 w-full rounded-lg border border-zinc-200 hover:border-zinc-400", image.displayPreset && "bg-white")}
              >
                <TechnicalImage set={set} image={image} preview />
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
      {viewer.open && viewer.selection && <TechnicalGallery set={set} role={role} index={viewer.selection.index} viewer={viewer} />}
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
      {sets.length === 1
        ? viewer.open && <TechnicalGallery set={sets[0]} role={role} index={0} viewer={viewer} />
        : viewer.selection !== null && <CompareViewer key={viewer.selection.version} open={viewer.open} role={role} sets={sets} activeId={activeId} close={viewer.close} trigger={viewer.trigger} />}
    </>
  );
}

function TechnicalGallery({ set, role, index, viewer }: {
  set: TechnicalImageSet;
  role: TechnicalImageRole;
  index: number;
  viewer: ReturnType<typeof useViewer>;
}) {
  const t = useTranslations("LensDetail");
  const images = set.images.map((image, position) => {
    const short = technicalImageShortLabel(image);
    const details = imageNotes(image, t);
    const label = short || t("opticalImages.imageNumber", { number: String(position + 1) });
    return {
      src: getLensImageUrl(set.id, image.id),
      label,
      alt: technicalImageAlt(t, set.model, image),
      filter: technicalImageFilter(image.displayPreset),
      caption: { primary: short, details },
    };
  });
  return (
    <LocalizedLensImageViewer
      images={images}
      initialIndex={index}
      title={`${t(role === "mtf" ? "opticalImages.mtf" : "opticalImages.structure")} · ${set.model}`}
      trigger={viewer.trigger}
      onClose={viewer.close}
    />
  );
}

function imageNotes(image: LensImageAsset, t: ReturnType<typeof useTranslations<"LensDetail">>) {
  return [
    ...getTechnicalImageConditions(image, t),
    getTechnicalImageReadingNote(image.conditionsNote),
  ].filter((line): line is string => !!line);
}

function CompareViewer({ open, role, sets, activeId, close, trigger }: {
  open: boolean;
  role: TechnicalImageRole;
  sets: TechnicalImageSet[];
  activeId: string;
  close: () => void;
  trigger: React.RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("LensDetail.opticalImages");
  const [active, setActive] = useState(activeId);
  return (
    <Dialog dismissOnOutsidePress open={open} onOpenChange={(open) => {if (!open) {close();}}}>
      <DialogPopup finalFocus={trigger} className="max-h-[85dvh] overflow-y-auto sm:w-[calc(100%_-_2rem)] sm:max-w-5xl">
        <DialogHeader className="relative">
          <DialogTitle>{t(role === "mtf" ? "mtf" : "structure")}</DialogTitle>
          <DialogClose className={cn(ICON_CLOSE_BTN_CLS, "absolute right-3 top-3 size-9")} aria-label={t("close")}><X className="size-4" /></DialogClose>
          {role === "mtf" && <p className="text-sm text-zinc-600">{t("compareConditions")}</p>}
        </DialogHeader>
        <div className="px-4 pb-3 sm:hidden">
          <ViewerSelect
            label={t("selectLens")}
            value={active}
            onChange={setActive}
            items={sets.map((set) => ({ value: set.id, label: set.model }))}
            className="w-full"
          />
        </div>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          {sets.map((set) => (
            <div key={set.id} className={cn("min-w-0", set.id !== active && "hidden sm:block")}>
              <ImagePanel set={set} />
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
      <SelectTrigger aria-label={label} className={cn("min-w-0 max-w-full whitespace-normal data-[size=default]:h-auto data-[size=default]:min-h-8", className)}>
        <SelectValue className="min-w-0 [overflow-wrap:anywhere]" />
      </SelectTrigger>
      <SelectContent align="end" className="w-max min-w-[min(var(--anchor-width),var(--available-width))] max-w-(--available-width)">
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="[&_[data-slot=chart-option-label]]:whitespace-normal [&_[data-slot=chart-option-label]]:[overflow-wrap:anywhere] [&>div]:min-w-0 [&>div]:shrink">
            <span data-slot="chart-option-label">{item.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ImagePanel({ set }: { set: TechnicalImageSet }) {
  const t = useTranslations("LensDetail");
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const image = set.images[index];
  const label = technicalImageShortLabel(image);
  const notes = imageNotes(image, t);
  const count = set.images.length;
  const multiple = count > 1;
  const optionLabels = multiple ? set.images.map(technicalImageShortLabel) : [];
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
        {multiple && (
          <ViewerSelect
            label={t("opticalImages.selectImage", { lens: set.model })}
            value={String(index)}
            onChange={(value) => setIndex(Number(value))}
            items={optionLabels.map((condition, position) => {
              const number = t("opticalImages.imageNumber", { number: String(position + 1) });
              return { value: String(position), label: !condition ? number : optionLabels.indexOf(condition) === optionLabels.lastIndexOf(condition) ? condition : `${condition} · ${number}` };
            })}
            className="text-xs"
          />
        )}
      </div>
      <div onTouchStart={multiple ? startSwipe : undefined} onTouchEnd={multiple ? endSwipe : undefined} onTouchCancel={() => {touch.current = null;}} className={cn(IMAGE_FRAME, "h-[min(36dvh,23rem)] touch-pan-y sm:h-[min(50dvh,27rem)]", image.displayPreset && "bg-white")}>
        <TechnicalImage set={set} image={image} />
      </div>
      <figcaption className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600">
        <div className="min-w-0 flex-1" aria-live="polite">
          {multiple && <p className="tabular-nums">{index + 1} / {count}</p>}
          {label && <p className="text-sm font-medium text-zinc-900">{label}</p>}
          {notes.map((line, i) => <p key={i}>{line}</p>)}
        </div>
        {multiple && <div className="flex shrink-0 gap-1">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label={t("opticalImages.previous")} className={IMAGE_CONTROL_CLS}><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={() => move(1)} disabled={index === count - 1} aria-label={t("opticalImages.next")} className={IMAGE_CONTROL_CLS}><ChevronRight className="size-4" /></button>
        </div>}
      </figcaption>
    </figure>
  );
}
