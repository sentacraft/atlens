"use client";

import { getToolName, isToolUIPart } from "ai";
import { Maximize } from "lucide-react";
import LensImagePreview from "@/components/lens/LensImagePreview";
import LocalizedLensImageViewer from "@/components/lens/LocalizedLensImageViewer";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { GalleryImage } from "@/components/lens/GalleryThumbnails";
import { FROSTED_OVERLAY_CHROME_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { Link } from "@/i18n/navigation";
import type { LensDetailDisplayImage } from "@/lib/ai/lens-detail-images";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { getTechnicalImageConditions, technicalImageFilter, technicalImageShortLabel } from "@/lib/lens/technical-images";
import { lensPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

function collectImages(parts: AskIrisUIMessage["parts"]) {
  const images = new Map<string, LensDetailDisplayImage>();
  for (const part of parts) {
    if (!isToolUIPart(part) || part.state !== "output-available" || getToolName(part) !== "lensDetails") {continue;}
    const output = part.output as { displayImages?: LensDetailDisplayImage[] } | null | undefined;
    for (const entry of output?.displayImages ?? []) {
      const previous = images.get(entry.imageRef);
      if (!previous) {
        images.set(entry.imageRef, entry);
      } else if (entry.gallery?.length) {
        images.set(entry.imageRef, { ...previous, gallery: [...(previous.gallery ?? []), ...entry.gallery] });
      }
    }
  }
  return [...images.values()];
}

function productGallery(entry: LensDetailDisplayImage) {
  if (entry.image.role !== "product" || !entry.gallery?.length) {return [];}
  const seen = new Set([entry.imageRef]);
  return entry.gallery.filter((item) => {
    if (seen.has(item.imageRef) || item.image.role !== "product" || item.lensId !== entry.lensId || item.mount !== entry.mount) {return false;}
    seen.add(item.imageRef);
    return true;
  });
}

export default function LensImageGroup({ parts }: { parts: AskIrisUIMessage["parts"] }) {
  const t = useTranslations("AskIris.lensImages");
  const detail = useTranslations("LensDetail");
  const trigger = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ images: GalleryImage[]; index: number } | null>(null);
  const entries = collectImages(parts);
  if (entries.length === 0) {return null;}

  const multiple = entries.length > 1;
  const mtfGroup = multiple && entries.every((entry) => entry.image.role === "mtf");

  function display(entry: LensDetailDisplayImage, number?: number) {
    const { image, lensName } = entry;
    const type = t("type", { role: image.role === "optical-construction" ? "structure" : image.role });
    const figure = number === undefined ? null : detail("opticalImages.imageNumber", { number: String(number) });
    const description = t("imageLabel", { type, lens: lensName });
    const label = figure ? `${figure} · ${description}` : description;
    const conditions = [
      technicalImageShortLabel(image),
      ...getTechnicalImageConditions(image, detail),
    ].filter(Boolean).join(" · ");
    return { type, figure, label, conditions };
  }

  function open(index: number, extras: LensDetailDisplayImage[], button: HTMLButtonElement) {
    const visibleRefs = new Set(entries.map((entry) => entry.imageRef));
    function slide(entry: LensDetailDisplayImage, number?: number): GalleryImage {
      const { label, conditions } = display(entry, number);
      return {
        src: entry.src, label, alt: label, filter: technicalImageFilter(entry.image.displayPreset),
        caption: { primary: label, details: conditions ? [conditions] : [] },
      };
    }
    const images = entries.map((entry, position) => slide(entry, multiple ? position + 1 : undefined));
    images.splice(index + 1, 0, ...extras.filter((entry) => !visibleRefs.has(entry.imageRef)).map((entry) => slide(entry)));
    trigger.current = button;
    setSelection({ index, images });
  }

  const title = mtfGroup ? detail("opticalImages.mtf") : t("title");
  return (
    <section aria-label={title} className="@container mt-2 mb-1 w-full max-w-160 px-1">
      {multiple ? <p className="mb-2 text-[13px] font-semibold">{title}</p> : null}
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        {entries.map((entry, index) => {
          const { type, figure, label, conditions } = display(entry, multiple ? index + 1 : undefined);
          const extras = productGallery(entry);
          const count = extras.length > 0 ? t("count", { count: extras.length + 1 }) : null;
          return (
            <figure key={entry.imageRef} className={cn("min-w-0", entries.length === 1 && "sm:max-w-76")}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={count ? t("openGallery", { label, count }) : detail("opticalImages.openImage", { label })}
                onClick={(event) => open(index, extras, event.currentTarget)}
                className="relative block h-33 w-full cursor-zoom-in overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 @lg:h-42"
              >
                <LensImagePreview
                  src={entry.src}
                  alt={label}
                  preview
                  preset={entry.image.displayPreset}
                  sizes="(max-width: 639px) 100vw, 304px"
                  className="p-3"
                />
                <span aria-hidden="true" className={cn(FROSTED_OVERLAY_CHROME_CLS, "absolute right-1.5 bottom-1.5 inline-flex h-6 items-center gap-1 rounded-md px-1 text-[11px] text-zinc-700 tabular-nums")}>
                  {count}
                  <Maximize className="size-3.5" />
                </span>
              </button>
              <figcaption className="mt-1.5 grid gap-0.5 text-xs leading-snug text-zinc-600 tabular-nums">
                <div className="font-semibold wrap-anywhere text-zinc-900">
                  {figure ? <span>{figure} · </span> : null}
                  {!mtfGroup ? <span>{type} · </span> : null}
                  <Link href={lensPath({ mount: entry.mount, id: entry.lensId })} className={TEXT_LINK_CLS}>{entry.lensName}</Link>
                </div>
                {conditions ? <span>{conditions}</span> : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {selection ? (
        <LocalizedLensImageViewer
          images={selection.images}
          initialIndex={selection.index}
          title={title}
          trigger={trigger}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </section>
  );
}
