import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import type { BrandCount } from "@/lib/charts/catalog";
import { brandLabel } from "@/lib/lens/format";
import { lineupPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One lineup per brand, so picking a brand is navigation, not page state. */
export default async function LineupBrandPicker({
  locale,
  mount,
  brands,
  current,
}: {
  locale: string;
  mount: Mount;
  brands: BrandCount[];
  current: string;
}) {
  const t = await getTranslations({ locale, namespace: "Charts" });
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  return (
    <nav aria-label={t("filterBrand")} className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-zinc-500">{t("filterBrand")}</span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {brands.map(({ brand, count }) => (
          <Link
            key={brand}
            href={lineupPath(mount, brand)}
            aria-current={brand === current ? "page" : undefined}
            className={cn(CHIP_BASE_CLS, brand === current ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS)}
          >
            {brandLabel(tBrand, brand)} {count}
          </Link>
        ))}
      </div>
    </nav>
  );
}
