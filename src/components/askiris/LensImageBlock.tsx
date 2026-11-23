"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import LensImagePreview from "@/components/lens/LensImagePreview";
import LocalizedLensImageViewer from "@/components/lens/LocalizedLensImageViewer";
import type { GalleryImage } from "@/components/lens/GalleryThumbnails";
import { FROSTED_OVERLAY_CHROME_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { Link } from "@/i18n/navigation";
import type { LensDetailDisplayImage } from "@/lib/ai/lens-detail-images";
import { groupLensImages } from "@/lib/askiris/lens-image-galleries";
import { getTechnicalImageConditions, technicalImageFilter, technicalImageShortLabel } from "@/lib/lens/technical-images";
import { lensPath } from "@/lib/url/routes";

/** The images one showLensImages call displayed, in place: a tile per image, grouped by lens and role. */
export default function LensImageBlock({ images }: { images: LensDetailDisplayImage[] }) {
  const t = useTranslations("AskIris.lensImages");
  const detail = useTranslations("LensDetail");
  const trigger = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState<{ index: number } | null>(null);
  if (images.length === 0) {return null;}

  const groups = groupLensImages(images);
  const mtfOnly = images.every(({ image }) => image.role === "mtf");
  const typeOf = (entry: LensDetailDisplayImage) => t("type", { role: entry.image.role === "optical-construction" ? "structure" : entry.image.role });
  const conditionsOf = (entry: LensDetailDisplayImage) => [
    technicalImageShortLabel(entry.image),
    ...getTechnicalImageConditions(entry.image, detail),
  ].filter(Boolean).join(" · ");
  const labelOf = (entry: LensDetailDisplayImage) => {
    const description = t("imageLabel", { type: typeOf(entry), lens: entry.lensName });
    return entry.figureLabel ? `${entry.figureLabel} · ${description}` : description;
  };
  const viewerImages = images.map((entry): GalleryImage => {
    const label = labelOf(entry);
    const conditions = conditionsOf(entry);
    return { src: entry.src, label, alt: label, filter: technicalImageFilter(entry.image.displayPreset), caption: { primary: label, details: conditions ? [conditions] : [] } };
  });

  return (
    <section aria-label={mtfOnly ? detail("opticalImages.mtf") : t("title")} className="@container mt-2 mb-3 w-full max-w-160 px-1">
      {groups.map((group) => {
        const [first] = group;
        return (
          <div key={first.imageRef} className="min-w-0 [&+&]:mt-3.5">
            <p className="mb-1.5 flex items-baseline gap-1.5 text-xs text-zinc-600">
              <Link href={lensPath({ mount: first.mount, id: first.lensId })} className={`${TEXT_LINK_CLS} font-semibold wrap-anywhere text-zinc-900`}>{first.lensName}</Link>
              <span className="shrink-0">· {typeOf(first)}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4 @lg:gap-2.5">
              {group.map((entry) => {
                const conditions = conditionsOf(entry);
                const label = labelOf(entry);
                return (
                  <figure key={entry.imageRef} className="m-0 min-w-0">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={detail("opticalImages.openImage", { label })}
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        setOpened({ index: images.indexOf(entry) });
                      }}
                      className="relative block h-24 w-full cursor-zoom-in overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 @lg:h-27"
                    >
                      <LensImagePreview src={entry.src} alt={label} preview preset={entry.image.displayPreset} sizes="(max-width: 639px) 50vw, 152px" className="p-2" />
                      {entry.figureLabel ? (
                        <span aria-hidden="true" className={`${FROSTED_OVERLAY_CHROME_CLS} absolute top-1.5 left-1.5 inline-flex h-4.5 items-center rounded-[5px] px-1.5 text-[11px] leading-4 font-semibold tabular-nums`}>
                          {entry.figureLabel}
                        </span>
                      ) : null}
                    </button>
                    {conditions ? <figcaption className="mt-1.5 text-xs leading-snug text-zinc-600 tabular-nums wrap-anywhere">{conditions}</figcaption> : null}
                  </figure>
                );
              })}
            </div>
          </div>
        );
      })}
      {opened ? (
        <LocalizedLensImageViewer
          images={viewerImages}
          initialIndex={opened.index}
          title={viewerImages[opened.index].label}
          trigger={trigger}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </section>
  );
}
