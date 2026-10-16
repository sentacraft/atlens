"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { COLLECTIONS, FEATURED_COLLECTION_SLUGS } from "@/lib/collections";
import { mountHasCollections } from "@/lib/mount";
import { collectionPath, collectionsPath } from "@/lib/url/routes";

const CARD_CLS =
  "flex flex-col gap-1.5 rounded-2xl border p-4 transition-colors sm:p-5";

export default function HomeCollections() {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";
  const mount = useEffectiveMount();
  if (!mountHasCollections(mount)) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{tNav("collections")}</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("collectionsIntro")}</p>
      <div className="mt-4 grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {FEATURED_COLLECTION_SLUGS.map((slug) => {
          const collection = COLLECTIONS[slug];
          return (
            <Link
              key={slug}
              href={collectionPath(mount, slug)}
              className={`${CARD_CLS} border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60`}
            >
              <span className="line-clamp-2 min-h-[2lh] text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {collection.title[lang]}
              </span>
              <span className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{collection.shortDescription[lang]}</span>
            </Link>
          );
        })}
        <Link
          href={collectionsPath(mount)}
          className={`${CARD_CLS} justify-center border-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:border-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200`}
        >
          <span className="text-sm font-semibold text-white dark:text-zinc-900">
            {t("allCollections", { count: Object.keys(COLLECTIONS).length })} →
          </span>
        </Link>
      </div>
    </section>
  );
}
