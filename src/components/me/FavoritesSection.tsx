"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { LensSummary } from "@/lib/lens/data";
import { getLensImageUrl } from "@/lib/lens/image";
import { equivalentFocal } from "@/lib/me/coverage";
import { ICON_NAV_BTN_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
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
  const tActions = useTranslations("LensActions");
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
              className="relative flex items-center gap-3 rounded-2xl border border-zinc-200 py-2.5 pr-1.5 pl-2.5 transition-colors hover:bg-zinc-50 md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0"
            >
              <FavoriteImage lensId={lens.id} />
              <div className="min-w-0 flex-1 md:px-3.5 md:pt-3 md:pb-3.5">
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
              <button
                type="button"
                onClick={() => favorites.toggle(lens.id)}
                aria-label={tActions("unfavorite")}
                className={cn(
                  ICON_NAV_BTN_CLS,
                  "relative z-10 h-11 w-11 text-zinc-900 md:absolute md:top-2 md:right-2 md:h-8 md:w-8",
                )}
              >
                <Star className="h-4 w-4" fill="currentColor" />
              </button>
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
