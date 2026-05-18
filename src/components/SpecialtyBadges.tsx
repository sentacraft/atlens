import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OpticalTrait } from "@/lib/types";

interface SpecialtyBadgesProps {
  isCine: boolean;
  opticalTraits: OpticalTrait[];
  className?: string;
}

const cinePillCls =
  "inline-flex items-center rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900";

const traitPillCls =
  "inline-flex items-center rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300";

export default function SpecialtyBadges({
  isCine,
  opticalTraits,
  className,
}: SpecialtyBadgesProps) {
  const t = useTranslations("SpecialtyBadge");

  if (!isCine && opticalTraits.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {isCine ? <span className={cinePillCls}>{t("cine")}</span> : null}
      {opticalTraits.map((trait) => (
        <span key={trait} className={traitPillCls}>
          {t(trait)}
        </span>
      ))}
    </div>
  );
}
