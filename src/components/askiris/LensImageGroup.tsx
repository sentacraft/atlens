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
import { groupLensImages } from "@/lib/askiris/lens-image-galleries";
import type { AskIrisUIMessage } from "@/lib/askiris/message-metadata";
import { getTechnicalImageConditions, technicalImageFilter, technicalImageShortLabel } from "@/lib/lens/technical-images";
import { lensPath } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

// Compatibility: replies saved after #763 (2026-11-21) and before the showLensImages split keep their galleries in
// lensDetails outputs, and stored conversations have no retention limit, so those replies live as long as their
// conversations do. Remove "lensDetails" here once a migration has rewritten them or conversations expire.
const IMAGE_TOOLS = new Set(["showLensImages", "lensDetails"]);

function collectGalleries(parts: AskIrisUIMessage["parts"]) {
  const entries = parts.flatMap((part) => {
    if (!isToolUIPart(part) || part.state !== "output-available" || !IMAGE_TOOLS.has(getToolName(part))) {return [];}
    const output = part.output as { displayImages?: LensDetailDisplayImage[] } | null | undefined;
    return output?.displayImages ?? [];
  });
  return groupLensImages(entries);
}

export default function LensImageGroup({ parts }: { parts: AskIrisUIMessage["parts"] }) {
  const t = useTranslations("AskIris.lensImages");
  const detail = useTranslations("LensDetail");
  const trigger = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ images: GalleryImage[]; title: string } | null>(null);
  const galleries = collectGalleries(parts);
  if (galleries.length === 0) {return null;}

  const multiple = galleries.length > 1;
  const mtfGroup = galleries.every(([entry]) => entry.image.role === "mtf");

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
    return { type, label, conditions };
  }

  function open(entries: LensDetailDisplayImage[], button: HTMLButtonElement) {
    const images = entries.map((entry, position): GalleryImage => {
      const { label, conditions } = display(entry, entries.length > 1 ? position + 1 : undefined);
      return {
        src: entry.src, label, alt: label, filter: technicalImageFilter(entry.image.displayPreset),
        caption: { primary: label, details: conditions ? [conditions] : [] },
      };
    });
    trigger.current = button;
    setSelection({ images, title: display(entries[0]).label });
  }

  const title = mtfGroup ? detail("opticalImages.mtf") : t("title");
  return (
    <section aria-label={title} className="@container mt-2 mb-1 w-full max-w-160 px-1">
      {multiple ? <p className="mb-2 text-[13px] font-semibold">{title}</p> : null}
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
        {galleries.map((gallery) => {
          const [entry] = gallery;
          const { type, label, conditions } = display(entry);
          const count = gallery.length > 1 ? t("count", { count: gallery.length }) : null;
          return (
            <figure key={entry.imageRef} className={cn("min-w-0", !multiple && "sm:max-w-76")}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={count ? t("openGallery", { label, count }) : detail("opticalImages.openImage", { label })}
                onClick={(event) => open(gallery, event.currentTarget)}
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
          initialIndex={0}
          title={selection.title}
          trigger={trigger}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </section>
  );
}
