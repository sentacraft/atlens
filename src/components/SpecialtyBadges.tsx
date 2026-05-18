import { useTranslations } from "next-intl";
import type { OpticalTrait } from "@/lib/types";

interface SpecialtyBadgesProps {
  isCine: boolean;
  opticalTraits: OpticalTrait[];
}

const cinePillCls =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

const traitPillCls =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300";

/**
 * Renders specialty pills as a Fragment with no wrapper element — the caller
 * is responsible for placing them inside a flex container. This lets the
 * lens card put them on the same row as the feature badges (so cards with
 * and without specialty share the same vertical rhythm), while the detail
 * and compare pages can wrap them in a dedicated row.
 */
export default function SpecialtyBadges({
  isCine,
  opticalTraits,
}: SpecialtyBadgesProps) {
  const t = useTranslations("SpecialtyBadge");

  return (
    <>
      {isCine ? <span className={cinePillCls}>{t("cine")}</span> : null}
      {opticalTraits.map((trait) => (
        <span key={trait} className={traitPillCls}>
          {t(trait)}
        </span>
      ))}
    </>
  );
}
