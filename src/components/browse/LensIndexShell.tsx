import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LENS_INDEX_SHELL_CLS, SECTION_TOP_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import SectionTabs from "@/components/nav/SectionTabs";
import { mountHasCollections } from "@/lib/mount";
import type { Mount } from "@/lib/types";
import { browsePath, collectionsPath } from "@/lib/url/routes";

export default function LensIndexShell({
  mount,
  active,
  className,
  children,
}: {
  mount: Mount;
  active: "browse" | "collections";
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("Nav");
  const tabs = [
    { key: "browse", label: t("allLenses"), href: browsePath(mount) },
    ...(mountHasCollections(mount)
      ? [{ key: "collections", label: t("collectionsAndBrands"), href: collectionsPath(mount) }]
      : []),
  ];

  return (
    <div className={cn(LENS_INDEX_SHELL_CLS, SECTION_TOP_CLS, "flex flex-col", className)}>
      <SectionTabs label={t("lenses")} tabs={tabs} active={active} />
      {children}
    </div>
  );
}
