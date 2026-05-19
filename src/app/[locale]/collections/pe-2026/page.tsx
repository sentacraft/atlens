import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAllLenses, getLensesByMount } from "@/lib/lens";
import { THEMES } from "@/lib/themes";
import { SITE } from "@/config/site";
import { buildAlternates, defaultOgImages } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import BackToTopButton from "@/components/BackToTopButton";
import ThemedLensGrid from "@/components/ThemedLensGrid";

const THEME_SLUG = "pe-2026";

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function pickTitleAndDescription(locale: string) {
  const theme = THEMES[THEME_SLUG]!;
  const isZh = locale === "zh";
  return {
    title: isZh ? theme.titleZh : theme.titleEn,
    description: isZh ? theme.descriptionZh : theme.descriptionEn,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const { title, description } = pickTitleAndDescription(locale);
  return {
    title,
    description,
    openGraph: {
      title: `${title} | X-Glass`,
      description,
      images: defaultOgImages(),
    },
    alternates: buildAlternates(locale, `lenses/${THEME_SLUG}`),
  };
}

export default async function PE2026Page({ params }: { params: Params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const theme = THEMES[THEME_SLUG];
  if (!theme) {
    notFound();
  }

  const tTheme = await getTranslations("Themes");
  const { title, description } = pickTitleAndDescription(locale);

  const all = getAllLenses(locale).filter(theme.filter);
  const xLenses = all.filter((l) => l.mount === "X");
  const gLenses = all.filter((l) => l.mount === "G");

  // CTA counts: live catalog count of non-placeholder lenses per mount.
  const xCatalogCount = getLensesByMount("X", locale).filter((l) => l.status !== "placeholder").length;
  const gCatalogCount = getLensesByMount("G", locale).filter((l) => l.status !== "placeholder").length;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: tTheme("breadcrumbRoot"),
        item: `${SITE.url}/${locale}/lenses/x`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `${SITE.url}/${locale}/lenses/${THEME_SLUG}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-zinc-900 dark:text-zinc-50 tracking-tight">
            {title}
          </h1>
          <p className="max-w-3xl text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {description}
          </p>
        </header>

        {xLenses.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {tTheme("xMountSection", { count: xLenses.length })}
            </h2>
            <ThemedLensGrid lenses={xLenses} />
          </section>
        )}

        {gLenses.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {tTheme("gMountSection", { count: gLenses.length })}
            </h2>
            <ThemedLensGrid lenses={gLenses} />
          </section>
        )}

        <section className="mt-6 flex flex-col gap-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {tTheme("ctaHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CtaCard
              href="/lenses/x"
              title={tTheme("ctaXTitle")}
              subtitle={tTheme("ctaXSubtitle", { count: xCatalogCount })}
            />
            <CtaCard
              href="/lenses/gfx"
              title={tTheme("ctaGTitle")}
              subtitle={tTheme("ctaGSubtitle", { count: gCatalogCount })}
            />
          </div>
        </section>
      </div>
      <BackToTopButton />
    </>
  );
}

function CtaCard({
  href,
  title,
  subtitle,
}: {
  href: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60"
    >
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</span>
      </div>
      <ArrowRight className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 dark:text-zinc-500" />
    </Link>
  );
}
