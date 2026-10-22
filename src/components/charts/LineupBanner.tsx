import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import type { Lineup } from "@/lib/charts/lineup";
import { brandLabel } from "@/lib/lens/format";
import { getLensImageUrl } from "@/lib/lens/image";
import { lineupPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";

const STRIP_SIZE = 6;

/** The entry from a brand collection to its lineup chart. */
export default async function LineupBanner({ locale, mount, lineup }: { locale: string; mount: Mount; lineup: Lineup }) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  // Spread the strip across the focal range: the widest-aperture prime of each column, then zooms.
  const pool = [...lineup.primes.map((column) => column.lenses.at(-1)!), ...lineup.zooms];
  const step = Math.max(1, pool.length / STRIP_SIZE);
  const strip = Array.from({ length: Math.min(STRIP_SIZE, pool.length) }, (_, i) => pool[Math.floor(i * step)]);

  return (
    <Link
      href={lineupPath(mount, lineup.brand)}
      className="group mb-8 flex flex-col items-start gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-colors hover:border-zinc-900 sm:flex-row sm:items-center"
    >
      <span className="flex shrink-0 items-end gap-0.5" aria-hidden="true">
        {strip.map((lens) => (
          <Image key={lens.id} src={getLensImageUrl(lens.id)} alt="" width={64} height={64} className="size-11 object-contain sm:size-16" />
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{t("lineupBannerEyebrow")}</span>
        <span className="text-base font-semibold text-zinc-900">
          {t("lineupTitle", { brand: lineup.brand, label: brandLabel(tBrand, lineup.brand) })}
        </span>
      </span>
      <span className={cn(ACTION_PRIMARY_CLS, "inline-flex h-9 shrink-0 items-center rounded-lg px-3.5 text-sm font-medium")}>
        {t("lineupBannerCta")}
      </span>
    </Link>
  );
}
