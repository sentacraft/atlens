"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { getSharedCollections } from "@/lib/collections";
import CollectionLinks from "@/components/collection/CollectionLinks";
import { PAGE_SECTION_CLS } from "@/config/ui-tokens";
import type { CollectionPreview } from "@/lib/collection-stats";
import type { Lens } from "@/lib/types";

export default function CompareCollections({
  allLenses,
  previews,
}: {
  allLenses: Lens[];
  previews: Record<string, CollectionPreview>;
}) {
  const t = useTranslations("Compare");
  const locale = useLocale();
  const { compareIds } = useCompare();
  const mount = useEffectiveMount();

  const activeLenses = useMemo(
    () =>
      compareIds
        .map((id) => allLenses.find((l) => l.id === id))
        .filter((l): l is Lens => l !== undefined),
    [compareIds, allLenses],
  );

  const sharedCollections = useMemo(
    () =>
      getSharedCollections(activeLenses, locale)
        .filter((c) => previews[c.slug])
        .map((c) => ({ collection: c, ...previews[c.slug] })),
    [activeLenses, locale, previews],
  );

  return (
    <CollectionLinks
      items={sharedCollections}
      mount={mount}
      locale={locale}
      title={t("collectionsTitle")}
      className={PAGE_SECTION_CLS}
    />
  );
}
