import { useTranslations } from "next-intl";
import type { OpticalTrait } from "@/lib/types";

interface SpecialtyBadgesProps {
  isCine: boolean;
  opticalTraits: OpticalTrait[];
  /**
   * When set, only the first `maxInline` pills render; the rest collapse
   * into a `+N` chip whose title attribute lists the hidden labels. Use on
   * narrow containers (lens card subtitle row) to keep the row single-line.
   * Omit on detail / compare pages to render every pill.
   */
  maxInline?: number;
}

const cinePillCls =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

const traitPillCls =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-300";

const overflowPillCls =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400";

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
  maxInline,
}: SpecialtyBadgesProps) {
  const t = useTranslations("SpecialtyBadge");

  const items: { key: string; label: string; cls: string }[] = [];
  if (isCine) items.push({ key: "cine", label: t("cine"), cls: cinePillCls });
  for (const trait of opticalTraits) {
    items.push({ key: trait, label: t(trait), cls: traitPillCls });
  }

  const limit = maxInline ?? items.length;
  const visible = items.slice(0, limit);
  const hidden = items.slice(limit);

  return (
    <>
      {visible.map((item) => (
        <span key={item.key} className={item.cls}>
          {item.label}
        </span>
      ))}
      {hidden.length > 0 ? (
        <span className={overflowPillCls} title={hidden.map((h) => h.label).join(", ")}>
          +{hidden.length}
        </span>
      ) : null}
    </>
  );
}
