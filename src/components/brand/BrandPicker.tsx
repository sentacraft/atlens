import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { BrandCount } from "@/lib/charts/catalog";
import { brandLabel } from "@/lib/lens/format";
import { brandPath } from "@/lib/url/routes";
import type { Mount } from "@/lib/types";

/** Links to the given brands' pages, with their lens counts, as a grid of tiles. */
export default async function BrandPicker({ locale, mount, brands, label }: { locale: string; mount: Mount; brands: BrandCount[]; label: string }) {
  const tBrand = await getTranslations({ locale, namespace: "Brands" });
  return (
    <nav aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {brands.map(({ brand, count }) => (
        <Link
          key={brand}
          href={brandPath(mount, brand)}
          className="flex h-12 items-center gap-2 rounded-xl border border-zinc-200 pr-3 pl-3.5 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{brandLabel(tBrand, brand)}</span>
          <span className="shrink-0 text-xs text-zinc-500">{count}</span>
          <ChevronRight className="size-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
