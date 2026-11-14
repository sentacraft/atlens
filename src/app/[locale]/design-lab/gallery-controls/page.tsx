"use client";

import { useState } from "react";
import LensImageGallery from "@/components/lens/LensImageGallery";
import GalleryCandidate from "./GalleryCandidate";
import { PAGE_GUTTER_CLS, SEGMENTED_LIST_CLS, SEGMENTED_TAB_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  { label: "Pancake", id: "sgimage-mf-18mm-f63-aps-c-ultra-slim-pancake-lens-x", model: "SG-Image MF 18mm F6.3", alternateImages: ["001"] },
  { label: "Standard", id: "fujifilm-xf-33mmf14-r-lm-wr-x", model: "Fujifilm XF 33mm F1.4 R LM WR" },
  { label: "Telephoto", id: "fujifilm-xf-150-600mmf56-8-r-lm-ois-wr-x", model: "Fujifilm XF 150-600mm F5.6-8 R LM OIS WR" },
];
const LABELS = { images: ["Main product image", "Product image 2"], open: "Enlarge current image", close: "Close current viewer", previous: "Previous current image", next: "Next current image" };

export default function GalleryControlsPage() {
  const [example, setExample] = useState(0);
  const lens = EXAMPLES[example];
  return (
    <main className={cn("mx-auto max-w-5xl py-8 pb-28", PAGE_GUTTER_CLS)}>
      <header className="mb-8 flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs text-zinc-500">Design lab · local preview only</p>
          <h1 className="font-heading text-3xl font-bold text-zinc-900">Gallery controls</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Hover the arrows and expand control. Click the image to open its viewer.</p>
        </div>
        <div className={cn(SEGMENTED_LIST_CLS, "w-full max-w-sm")} aria-label="Lens shape">
          {EXAMPLES.map((item, i) => <button key={item.id} type="button" aria-pressed={i === example} data-active={i === example ? "" : undefined} className={SEGMENTED_TAB_CLS} onClick={() => setExample(i)}>{item.label}</button>)}
        </div>
        <p className="text-sm font-medium text-zinc-700">{lens.model}</p>
      </header>
      <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
        <section aria-label="Current gallery" className="min-w-0">
          <h2 className="mb-1 text-base font-semibold text-zinc-900">Current</h2>
          <p className="mb-5 text-xs leading-5 text-zinc-500">20px image padding · rectangular hover · edge-to-edge thumbnails</p>
          <div className="mx-auto w-full max-w-64 sm:mx-0"><LensImageGallery key={lens.id} lens={lens} labels={LABELS} /></div>
        </section>
        <section aria-label="Proposed gallery" className="min-w-0">
          <h2 className="mb-1 text-base font-semibold text-zinc-900">Proposed</h2>
          <p className="mb-5 text-xs leading-5 text-zinc-500">32px image padding · 44px circular controls · 4px thumbnail padding</p>
          <div className="mx-auto w-full max-w-64 sm:mx-0"><GalleryCandidate key={lens.id} lens={lens} /></div>
        </section>
      </div>
      <p className="mt-8 max-w-xl text-xs leading-5 text-zinc-500">The image opens the viewer; only the arrows change images. On phones, swipe the image without opening the viewer. There are no invisible left/right click zones.</p>
    </main>
  );
}
