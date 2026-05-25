import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Props {
  lensCount: number;
  brandCount: number;
}

export default function BrowseAllTile({ lensCount, brandCount }: Props) {
  const t = useTranslations("Collection");
  return (
    <Link
      href="/lenses/x"
      className="flex h-[88px] items-center justify-between overflow-hidden rounded-2xl bg-zinc-900 px-4 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          {t("browseAllEyebrow")}
        </p>
        <h3 className="text-sm font-semibold leading-snug md:text-xs">
          {t("browseAllTitle")}
        </h3>
        <p className="text-xs text-zinc-400 md:text-[10px] dark:text-zinc-500">
          {t("stats", { count: lensCount, brandCount })}
        </p>
      </div>
      <span aria-hidden="true" className="shrink-0 font-mono text-2xl">→</span>
    </Link>
  );
}
