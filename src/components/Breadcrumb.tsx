"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountToUrlSegment } from "@/lib/mount";

/**
 * "Back to lenses" affordance for third-level pages (lens detail, compare).
 * Surfaces the way home so users who arrived deep in the tree don't have to
 * rely on the browser back button or hunt for the "镜头" link in the nav.
 *
 * Mount-aware: the target is `/lenses/{currentMount}`, so a user browsing
 * G-mount detail pages goes back to the G-mount list, not X.
 */
export default function Breadcrumb() {
  const t = useTranslations("LensList");
  const mount = useEffectiveMount();
  const seg = mountToUrlSegment(mount);

  return (
    <Link
      href={`/lenses/${seg}`}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      <ArrowLeft className="size-3.5" />
      {t("backLink")}
    </Link>
  );
}
