import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import type { BrandCount } from "@/lib/charts/catalog";
import { brandLabel } from "@/lib/lens/format";
import { brandPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Links to the given brands' pages, with their lens counts. */
export default async function BrandPicker({ locale, mount, brands, label }: { locale: string; mount: Mount; brands: BrandCount[]; label: string }) {
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {brands.map(({ brand, count }) => (
        <Link key={brand} href={brandPath(mount, brand)} className={cn(CHIP_BASE_CLS, CHIP_IDLE_CLS)}>
          {brandLabel(tBrand, brand)} {count}
        </Link>
      ))}
    </nav>
  );
}
