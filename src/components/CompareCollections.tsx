"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useCompare } from "@/context/CompareProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { getLensesByMount } from "@/lib/lens";
import { getSharedCollections } from "@/lib/collections";
import { mountToUrlSegment } from "@/lib/mount";
import CollectionPills from "@/components/CollectionPills";
import type { Lens } from "@/lib/types";

export default function CompareCollections() {
  const t = useTranslations("Compare");
  const locale = useLocale();
  const { compareIds } = useCompare();
  const mount = useEffectiveMount();
  const seg = mountToUrlSegment(mount);

  const activeLenses = useMemo(
    () =>
      compareIds
        .map((id) => getLensesByMount(mount, locale).find((l) => l.id === id))
        .filter((l): l is Lens => l !== undefined),
    [compareIds, mount, locale],
  );

  const sharedCollections = useMemo(
    () => getSharedCollections(activeLenses, mount, locale),
    [activeLenses, mount, locale],
  );

  return (
    <CollectionPills
      collections={sharedCollections}
      mountSegment={seg}
      locale={locale}
      title={t("collectionsTitle")}
      viewAllLabel={t("viewAllCollections")}
    />
  );
}
