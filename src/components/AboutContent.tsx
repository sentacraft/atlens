import { getTranslations, getLocale } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import FeedbackTrigger from "@/components/FeedbackTrigger";
import AnthropicLogo from "@/components/logos/AnthropicLogo";
import GeminiLogo from "@/components/logos/GeminiLogo";
import GitHubMark from "@/components/logos/GitHubMark";
import { ExternalLink } from "@/components/ui/external-link";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getLensesByMount } from "@/lib/lens";
import coverageMeta from "@/data/coverage-meta.json";
import AckCard from "@/components/AckCard";

type CoverageMeta = { active: boolean; discontinued: boolean | "planned"; notes: string };

function Check() {
  return <span className="text-zinc-700 dark:text-zinc-300 text-sm">✓</span>;
}
function Planned() {
  return <span className="text-zinc-400 dark:text-zinc-500 text-sm">○</span>;
}
function Dash() {
  return <span className="text-zinc-300 dark:text-zinc-600 text-sm">—</span>;
}

function MountCoverageTable({
  title, brands, counts, meta, brandNames, col, rowTotal,
}: {
  title: string;
  brands: string[];
  counts: Record<string, number>;
  meta: Record<string, CoverageMeta>;
  brandNames: Record<string, string>;
  col: { brand: string; count: string; active: string; discontinued: string };
  rowTotal: string;
}) {
  const total = brands.reduce((s, b) => s + (counts[b] ?? 0), 0);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden self-start">
        <table className="text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 w-28">{col.brand}</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 w-14">{col.active}</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 w-14">{col.discontinued}</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{col.count}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {brands.map((b) => {
              const m: CoverageMeta = (meta as Record<string, CoverageMeta>)[b] ?? { active: false, discontinued: false, notes: "" };
              return (
                <tr key={b}>
                  <td className="px-3 py-2 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">{brandNames[b] ?? b}</td>
                  <td className="px-3 py-2 text-center">{m.active ? <Check /> : <Dash />}</td>
                  <td className="px-3 py-2 text-center">{m.discontinued === true ? <Check /> : m.discontinued === "planned" ? <Planned /> : <Dash />}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{counts[b] ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <td className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{rowTotal}</td>
              <td colSpan={2} />
              <td className="px-3 py-2 text-right tabular-nums text-xs font-semibold text-zinc-700 dark:text-zinc-300">{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-20">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AboutContent() {
  const [t, tBrand, locale] = await Promise.all([
    getTranslations("About"),
    getTranslations("Brands"),
    getLocale(),
  ]);

  const xCounts = getLensesByMount("X", locale).reduce<Record<string, number>>(
    (acc, l) => { acc[l.brand] = (acc[l.brand] ?? 0) + 1; return acc; }, {}
  );
  const gCounts = getLensesByMount("G", locale).reduce<Record<string, number>>(
    (acc, l) => { acc[l.brand] = (acc[l.brand] ?? 0) + 1; return acc; }, {}
  );
  const X_BRANDS = ["fujifilm","sigma","tamron","viltrox","7artisans","ttartisan","brightinstar","sgimage"];
  const G_BRANDS = ["fujifilm"];

  const pipelineStages = [
    { badge: "0", label: t("pipeline0Label"), desc: t("pipeline0Desc") },
    { badge: "1", label: t("pipeline1Label"), desc: t("pipeline1Desc") },
    { badge: "2", label: t("pipeline2Label"), desc: t("pipeline2Desc") },
    { badge: "R", label: t("pipelineRLabel"), desc: t("pipelineRDesc") },
    { badge: "P", label: t("pipelinePLabel"), desc: t("pipelinePDesc") },
  ];

  const ackCredits = [
    {
      roles: [t("ackClaudeArchitect"), t("ackClaudeEngineer")],
      company: "Anthropic",
      product: "Claude Code",
      logoComponent: <AnthropicLogo size={37} />,
      glowColor: "rgba(226, 112, 37, 0.06)",
    },
    {
      roles: [t("ackGeminiDesigner"), t("ackGeminiBrandStrategist")],
      company: "Google",
      product: "Gemini",
      logoComponent: <GeminiLogo size={37} />,
      glowColor: "rgba(66, 133, 244, 0.06)",
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-12 pb-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-heading">
          {t("pageTitle")}
        </h1>
      </div>

      {/* Table of Contents */}
      <nav className="flex flex-col gap-1">
        {[
          { id: "background", label: t("backgroundTitle") },
          { id: "coverage", label: t("coverageTitle") },
          { id: "data-accuracy", label: t("dataAccuracyTitle") },
          { id: "disclaimer", label: t("disclaimerTitle") },
          { id: "privacy", label: t("privacyTitle") },
          { id: "donation", label: t("donationTitle") },
          { id: "ack", label: t("ackTitle") },
        ].map(({ id, label }, i) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <span className="text-[10px] text-zinc-300 dark:text-zinc-600 w-4 text-right tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            {label}
          </a>
        ))}
      </nav>

      {/* Background */}
      <Section id="background" title={t("backgroundTitle")}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("backgroundBody1")}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("backgroundBody2")}
        </p>
      </Section>

      {/* Coverage */}
      <Section id="coverage" title={t("coverageTitle")}>
        <div className="flex flex-col gap-4">
          {([
            { key: "coverageBrandsX", brands: X_BRANDS, counts: xCounts, meta: coverageMeta.x, roadmapKey: "coverageXRoadmap" },
            { key: "coverageBrandsG", brands: G_BRANDS, counts: gCounts, meta: coverageMeta.g, roadmapKey: "coverageGRoadmap" },
          ] as const).map(({ key, brands, counts, meta, roadmapKey }) => (
            <div key={key} className="flex flex-col gap-2">
              <MountCoverageTable
                title={t(key)}
                brands={[...brands]}
                counts={counts}
                meta={meta as Record<string, CoverageMeta>}
                brandNames={Object.fromEntries(brands.map((b) => [b, tBrand(b as Parameters<typeof tBrand>[0])]))}
                col={{ brand: t("coverageColBrand"), count: t("coverageColCount"), active: t("coverageColActive"), discontinued: t("coverageColDiscontinued") }}
                rowTotal={t("coverageRowTotal")}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-500">
                {t(roadmapKey)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("coverageSuggest")}{" "}
          <FeedbackTrigger
            type="general"
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {t("coverageSuggestCta")}
          </FeedbackTrigger>
        </p>
      </Section>

      {/* Data & Accuracy */}
      <Section id="data-accuracy" title={t("dataAccuracyTitle")}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("dataAccuracyIntro")}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t("dataAccuracyReport")}{" "}
          <FeedbackTrigger
            type="data_issue"
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {t("dataAccuracyReportCta")}
          </FeedbackTrigger>
        </p>

        {/* ── Spec Data subsection ── */}
        <div className="flex flex-col gap-3 mt-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t("dataSpecTitle")}
          </p>
          <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t(`dataSpecPoint${i}Title`)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
                  {t(`dataSpecPoint${i}Body`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline overview */}
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-col gap-3">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {t("dataPipelineIntro")}
          </p>
          <ol className="flex flex-col gap-2.5">
            {pipelineStages.map((stage) => (
              <li key={stage.badge} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-mono text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {stage.badge}
                </span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {stage.label}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500 ml-2">
                    {stage.desc}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          {/* Inline GitHub link for users who want to dive deeper mid-flow */}
          <ExternalLink
            href="https://github.com/sentacraft/x-glass#data-pipeline"
            className="inline-flex items-center gap-0.5 self-start text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            {t("dataPipelineFlowNote")}
          </ExternalLink>
        </div>

        {/* Update cadence */}
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {t("dataUpdateNote")}{"  "}{t("dataVersionNote")}
        </p>

        {/* ── Price Data subsection ── */}
        <div className="flex flex-col gap-3 mt-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {t("dataPricingTitle")}
          </p>
          <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-zinc-200 dark:border-zinc-700">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t(`dataPricingPoint${i}Title`)}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
                  {t(`dataPricingPoint${i}Body`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* GitHub CTA card — covers both spec and pricing pipelines */}
        <a
          href="https://github.com/sentacraft/x-glass#data-pipeline"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
        >
          <GitHubMark size={24} className="mt-0.5 shrink-0 text-zinc-700 dark:text-zinc-300" />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {t("dataGitHubCardTitle")}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
              {t("dataGitHubCardBody")}
            </p>
            <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-zinc-700 group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-zinc-100 transition-colors">
              {t("dataGitHubCardButton")}
              <ArrowUpRight className="size-3" />
            </span>
          </div>
        </a>
      </Section>

      {/* Disclaimer */}
      <Section id="disclaimer" title={t("disclaimerTitle")}>
        <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/40 px-4 py-3 flex flex-col gap-2">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {t("disclaimerAccuracy")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            {t("disclaimerLiability")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            {t("disclaimerIndependent")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
            {t("disclaimerCopyright")}
          </p>
        </div>
      </Section>

      {/* Privacy */}
      <Section id="privacy" title={t("privacyTitle")}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("privacyBody")}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("privacyAnalytics")}
        </p>
      </Section>

      {/* Donation */}
      <Section id="donation" title={t("donationTitle")}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("donationBody")}
        </p>
        {locale === "zh" ? (
          <div className="mt-1">
            <Image
              src="/wechat-qr.jpg"
              alt={t("donationWechatQrAlt")}
              width={200}
              height={200}
              className="rounded-xl block"
            />
          </div>
        ) : (
          <div className="mt-1">
            <a
              href="https://ko-fi.com/sentacraft"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z" fill="#FF5E5B"/>
              </svg>
              {t("donationKofi")}
            </a>
          </div>
        )}
      </Section>

      {/* Acknowledgments */}
      <Section id="ack" title={t("ackTitle")}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {t("ackBody")}
        </p>

        {/* Card + story pairs — card IS the accordion trigger */}
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {ackCredits.map(({ roles, company, product, logoComponent, glowColor }, i) => {
            const storyKey = i === 0 ? "1" : "2";
            const body = t(`ackStory${storyKey}Body` as "ackStory1Body");
            return (
              <AckCard
                key={`${company}-${product}`}
                roles={roles}
                company={company}
                product={product}
                logoComponent={logoComponent}
                glowColor={glowColor}
                body={body}
                isClaudeCard={i === 0}
                locale={locale}
              />
            );
          })}
        </div>

        {/* Closing line */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
            {t("ackClosing")}
          </p>
        </div>
      </Section>
    </div>
  );
}
