"use client";

import { useState } from "react";
import Image from "next/image";
import { getLensImageUrl, lensImageStyle } from "@/lib/lens/image";
import type { Lens } from "@/lib/types";

export default function LensImageGallery({
  lens, primaryLabel, imageLabels,
}: {
  lens: Pick<Lens, "id" | "model" | "alternateImages">;
  primaryLabel: string;
  imageLabels?: string[];
}) {
  const [selected, setSelected] = useState<string>();
  const images = [undefined, ...(lens.alternateImages ?? [])];

  return (
    <>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/70 p-5">
        <div className="relative aspect-square w-full overflow-hidden">
          <Image
            key={selected ?? "primary"}
            src={getLensImageUrl(lens.id, selected)}
            alt={lens.model}
            fill
            sizes="256px"
            style={lensImageStyle}
            className="object-contain"
            preload={selected === undefined}
          />
        </div>
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto p-1">
          {images.map((id, index) => (
            <button
              key={id ?? "primary"}
              type="button"
              aria-label={index === 0 ? primaryLabel : imageLabels?.[index - 1]}
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
              className="relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 aria-pressed:border-zinc-600 focus-visible:outline-2"
            >
              <Image src={getLensImageUrl(lens.id, id)} alt="" fill sizes="48px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
