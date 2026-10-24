"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LensSummary } from "@/lib/lens/data";
import { getLensImageUrl } from "@/lib/lens/image";
import { equivalentFocal } from "@/lib/me/coverage";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompareToggle } from "@/hooks/useCompareToggle";
import LensActions from "@/components/lens/LensActions";
import { LensSilhouette } from "@/components/ui/lens-silhouette";
import { lensPath } from "@/lib/url/routes";
import { brandLabel } from "@/lib/lens/format";

function equivalentRange(lens: LensSummary): string {
  const min = equivalentFocal(lens.focalLengthMin, lens.mount);
  const max = equivalentFocal(lens.focalLengthMax, lens.mount);
  return min === max ? `${min}mm` : `${min}–${max}mm`;
}

export default function FavoritesSection({
  id,
  className,
  lenses,
  heading,
}: {
  id: string;
  className: string;
  lenses: LensSummary[];
  heading: (count: number) => ReactNode;
}) {
  const t = useTranslations("Profile");
  const tBrand = useTranslations("Brands");
  const favorites = useFavorites();
  const lensById = useMemo(() => new Map(lenses.map((lens) => [lens.id, lens])), [lenses]);
  const favoriteLenses = favorites.lensIds.flatMap((lensId) => {
    const lens = lensById.get(lensId);
    return lens ? [lens] : [];
  });

  return (
    <section id={id} className={className}>
      {heading(favoriteLenses.length)}
      {favoriteLenses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-5 text-center text-sm text-zinc-500">
          {t("noFavorites")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
          {favoriteLenses.map((lens) => (
            <li
              key={lens.id}
              className="relative flex flex-col gap-2 rounded-2xl border border-zinc-200 p-2.5 transition-colors hover:bg-zinc-50 md:gap-0 md:overflow-hidden md:p-0"
            >
              <div className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-0">
                <FavoriteImage lensId={lens.id} />
                <div className="min-w-0 flex-1 md:px-3.5 md:pt-3">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    {brandLabel(tBrand, lens.brand)}
                  </div>
                  <Link
                    href={lensPath(lens)}
                    className="block truncate text-sm font-semibold text-zinc-900 after:absolute after:inset-0 after:content-['']"
                  >
                    {lens.model}
                  </Link>
                  <div className="truncate text-xs text-zinc-500">
                    {t("equivalent", { range: equivalentRange(lens) })}
                  </div>
                </div>
              </div>
              <FavoriteLensActions lens={lens} name={`${brandLabel(tBrand, lens.brand)} ${lens.model}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FavoriteImage({ lensId }: { lensId: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex h-[52px] w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 md:aspect-[3/2] md:h-auto md:w-full md:rounded-none md:border-b md:border-zinc-100 md:bg-zinc-50/40 md:p-4">
      {failed ? (
        <LensSilhouette className="h-9 w-9" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- catalog webp; images are unoptimized on Workers
        <img src={getLensImageUrl(lensId)} alt="" onError={() => setFailed(true)} className="h-full w-full object-contain p-1" />
      )}
    </div>
  );
}

function FavoriteLensActions({ lens, name }: { lens: LensSummary; name: string }) {
  const compare = useCompareToggle(lens);
  return <LensActions lensId={lens.id} lensName={name} compare={compare} tier="row" className="self-end md:px-3.5 md:pt-2 md:pb-3.5" />;
}
