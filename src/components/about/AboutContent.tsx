import { getTranslations, getLocale } from "next-intl/server";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import AnthropicLogo from "@/components/logos/AnthropicLogo";
import GeminiLogo from "@/components/logos/GeminiLogo";
import GitHubMark from "@/components/logos/GitHubMark";
import { lensCountsByBrand } from "@/lib/lens/data";
import { CATALOG_COVERAGE, type BrandCoverage, type CoverageState } from "@/lib/lens/catalog-coverage";
import AckCard from "@/components/about/AckCard";
import { isPurchaseLocale } from "@/lib/purchase/links";
import SupportPanel from "@/components/support/SupportPanel";
import { PAGE_GUTTER_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { SITE } from "@/config/site";
import { ASK_IRIS_PATH, RECENTLY_ADDED_PATH } from "@/lib/url/routes";

function Check() {
  return <span className="text-zinc-700 text-sm">✓</span>;
}
function Partial() {
  return <span className="text-zinc-600 text-sm">◐</span>;
}
function Pending() {
  return <span className="text-zinc-400 text-sm">○</span>;
}
function Dash() {
  return <span className="text-zinc-300 text-sm">—</span>;
}
function NotApplicable() {
  return <span className="text-zinc-400 text-sm tracking-wider uppercase">N/A</span>;
}

function StateCell({ state }: { state: CoverageState }) {
  if (state === true) {
    return <Check />;
  }
  if (state === "partial") {
    return <Partial />;
  }
  if (state === "planned") {
    return <Pending />;
  }
  if (state === "n/a") {
    return <NotApplicable />;
  }
  return <Dash />;
}

function MountCoverageTable({
  title, counts, meta, brandNames, col, rowTotal,
}: {
  title: string;
  counts: Record<string, number>;
  meta: Record<string, BrandCoverage>;
  brandNames: Record<string, string>;
  col: { brand: string; count: string; photoGroup: string; active: string; discontinued: string; cinema: string };
  rowTotal: string;
}) {
  const brands = Object.keys(meta);
  const total = brands.reduce((s, b) => s + (counts[b] ?? 0), 0);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-zinc-600">{title}</p>
      <div className="rounded-lg border border-zinc-200 overflow-x-auto self-start max-w-full">
        <table className="text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th rowSpan={2} className="px-2 sm:px-3 py-2 text-center text-sm font-semibold text-zinc-500 align-middle border-b border-r border-zinc-200 w-24 sm:w-28">{col.brand}</th>
              <th colSpan={2} className="px-2 sm:px-3 pt-2 pb-1 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap border-b border-zinc-200">{col.photoGroup}</th>
              <th rowSpan={2} className="px-2 sm:px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap align-middle border-b border-zinc-200 w-16 sm:w-20 border-l border-zinc-200">{col.cinema}</th>
              <th rowSpan={2} className="px-2 sm:px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400 whitespace-nowrap align-middle border-b border-zinc-200 border-l border-zinc-200 w-16 sm:w-20">{col.count}</th>
            </tr>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-2 sm:px-3 py-2 text-center text-xs font-medium text-zinc-400 align-middle w-20 sm:w-28">{col.active}</th>
              <th className="px-2 sm:px-3 py-2 text-center text-xs font-medium text-zinc-400 align-middle w-20 sm:w-28">{col.discontinued}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {brands.map((b) => {
              const m = meta[b];
              return (
                <tr key={b}>
                  <td className="px-2 sm:px-3 py-2 text-center font-medium text-zinc-800 whitespace-nowrap border-r border-zinc-200">{brandNames[b] ?? b}</td>
                  <td className="px-2 sm:px-3 py-2 text-center"><StateCell state={m.active} /></td>
                  <td className="px-2 sm:px-3 py-2 text-center"><StateCell state={m.discontinued} /></td>
                  <td className="px-2 sm:px-3 py-2 text-center border-l border-zinc-200"><StateCell state={m.cinema} /></td>
                  <td className="px-2 sm:px-3 py-2 text-center tabular-nums text-zinc-700 border-l border-zinc-200">
                    {m.active === true || m.active === "partial"
                      ? (counts[b] ?? 0)
                      : m.active === "planned" || m.discontinued === "planned" || m.cinema === "planned"
                        ? <Pending />
                        : <Dash />}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 bg-zinc-50">
              <td className="px-2 sm:px-3 py-2 text-xs font-medium text-zinc-500 border-r border-zinc-200">{rowTotal}</td>
              <td colSpan={3} />
              <td className="px-2 sm:px-3 py-2 text-center tabular-nums text-xs font-semibold text-zinc-700 border-l border-zinc-200">{total}</td>
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
      <h2 className="text-base font-semibold text-zinc-900">
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

  const xCounts = lensCountsByBrand("X", locale);
  const gCounts = lensCountsByBrand("G", locale);

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
    <div className={`w-full max-w-3xl mx-auto pt-4 sm:pt-12 pb-40 flex flex-col gap-6 ${PAGE_GUTTER_CLS}`}>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 font-heading">
          {t("pageTitle")}
        </h1>
      </div>
      <p className="-mt-3 text-sm text-zinc-500">
        {t("rebrandNote")}
      </p>

      <nav className="flex flex-col gap-1">
        {[
          { id: "background", label: t("backgroundTitle") },
          { id: "coverage", label: t("coverageTitle") },
          { id: "data-accuracy", label: t("dataAccuracyTitle") },
          { id: "ask-iris", label: t("askIrisTitle") },
          { id: "disclaimer", label: t("disclaimerTitle") },
          { id: "reuse", label: t("reuseTitle") },
          { id: "privacy", label: t("privacyTitle") },
          { id: "support", label: t("supportTitle") },
          { id: "ack", label: t("ackTitle") },
        ].map(({ id, label }, i) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <span className="text-[10px] text-zinc-300 w-4 text-right tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            {label}
          </a>
        ))}
      </nav>

      <Section id="background" title={t("backgroundTitle")}>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("backgroundBody1")}
        </p>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("backgroundBody2")}
        </p>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("backgroundBody3")}
        </p>
      </Section>

      <Section id="coverage" title={t("coverageTitle")}>
        <div className="flex flex-col gap-4">
          {([
            { key: "coverageBrandsX", meta: CATALOG_COVERAGE.X, counts: xCounts },
            { key: "coverageBrandsG", meta: CATALOG_COVERAGE.G, counts: gCounts },
          ] as const).map(({ key, counts, meta }) => (
            <div key={key} className="flex flex-col gap-2">
              <MountCoverageTable
                title={t(key)}
                counts={counts}
                meta={meta}
                brandNames={Object.fromEntries(Object.keys(meta).map((b) => [b, tBrand(b as Parameters<typeof tBrand>[0])]))}
                col={{
                  brand: t("coverageColBrand"),
                  count: t("coverageColCount"),
                  photoGroup: t("coverageColPhotoGroup"),
                  active: t("coverageColActive"),
                  discontinued: t("coverageColDiscontinued"),
                  cinema: t("coverageColCinema"),
                }}
                rowTotal={t("coverageRowTotal")}
              />
              <p className="text-xs text-zinc-400">
                {t("coverageLegend")}
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-600">
          {t.rich("coverageSuggest", {
            feedback: (chunks) => (
              <FeedbackTrigger type="general">
                {chunks}
              </FeedbackTrigger>
            ),
          })}
        </p>
        <Link
          href={RECENTLY_ADDED_PATH}
          className="inline-flex items-center gap-0.5 self-start text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          {t("recentlyAddedLink")}
          <ArrowRight className="size-3" />
        </Link>
      </Section>

      <Section id="data-accuracy" title={t("dataAccuracyTitle")}>
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3">
          <p className="text-sm text-zinc-600 leading-relaxed">
            {t.rich("dataAccuracyCaveat", {
              feedback: (chunks) => (
                <FeedbackTrigger type="data_issue">
                  {chunks}
                </FeedbackTrigger>
              ),
            })}
          </p>
        </div>

        <p className="text-sm text-zinc-600 leading-relaxed">
          {t.rich("dataAccuracyIntro", {
            github: (chunks) => (
              <a href={SITE.pipelineDocUrl} target="_blank" rel="noopener noreferrer" className={TEXT_LINK_CLS}>
                {chunks}
              </a>
            ),
          })}
        </p>

        <div className="flex flex-col gap-3 mt-1">
          <p className="text-sm font-medium text-zinc-800">
            {t("dataSpecTitle")}
          </p>
          <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-zinc-200">
            {([1, 2, 3, 4] as const).map((i) => (
              <div key={i}>
                <p className="text-sm font-medium text-zinc-700">
                  {t(`dataSpecPoint${i}Title`)}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {t(`dataSpecPoint${i}Body`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          {t("dataUpdateNote")}
        </p>

        <div className="flex flex-col gap-3 mt-1">
          <p className="text-sm font-medium text-zinc-800">
            {t("dataPricingTitle")}
          </p>
          <div className="flex flex-col gap-2.5 pl-3 border-l-2 border-zinc-200">
            {([1, 2, 3, 4] as const).map((i) => (
              <div key={i}>
                <p className="text-sm font-medium text-zinc-700">
                  {t(`dataPricingPoint${i}Title`)}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {t(`dataPricingPoint${i}Body`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <a
          href={SITE.pipelineDocUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          <GitHubMark size={24} className="mt-0.5 shrink-0 text-zinc-700" />
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-800">
              {t("dataGitHubCardTitle")}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {t("dataGitHubCardBody")}
            </p>
            <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors">
              {t("dataGitHubCardButton")}
              <ArrowUpRight className="size-3" />
            </span>
          </div>
        </a>
      </Section>

      <Section id="ask-iris" title={t("askIrisTitle")}>
        <p className="text-sm leading-relaxed text-zinc-600">
          {t.rich("askIrisBody", {
            askIris: (chunks) => (
              <Link href={ASK_IRIS_PATH} className={TEXT_LINK_CLS}>
                {chunks}
              </Link>
            ),
          })}
        </p>
      </Section>

      <Section id="disclaimer" title={t("disclaimerTitle")}>
        <div className="rounded-lg bg-amber-50/70 border border-amber-200/70 px-4 py-3 flex flex-col gap-2">
          <p className="text-sm text-zinc-700 leading-relaxed">
            {t("disclaimerAccuracy")}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {t("disclaimerLiability")}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {t("disclaimerIndependent")}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {t.rich("disclaimerCopyright", {
              address: SITE.contactEmail,
              email: (chunks) => (
                <a href={`mailto:${SITE.contactEmail}`} className="underline underline-offset-2">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </Section>

      <Section id="reuse" title={t("reuseTitle")}>
        <ul className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-600">
          <li>{t.rich("reuseWelcome", { host: SITE.host, b: (chunks) => <strong className="font-semibold text-zinc-800">{chunks}</strong> })}</li>
          <li>{t.rich("reuseForbidden", { b: (chunks) => <strong className="font-semibold text-zinc-800">{chunks}</strong> })}</li>
          <li>
            {t.rich("reuseContact", {
              address: SITE.contactEmail,
              b: (chunks) => <strong className="font-semibold text-zinc-800">{chunks}</strong>,
              email: (chunks) => (
                <a href={`mailto:${SITE.contactEmail}`} className={TEXT_LINK_CLS}>
                  {chunks}
                </a>
              ),
            })}
          </li>
          <li>{t.rich("reuseImages", { b: (chunks) => <strong className="font-semibold text-zinc-800">{chunks}</strong> })}</li>
        </ul>
      </Section>

      <Section id="privacy" title={t("privacyTitle")}>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("privacyBody")}
        </p>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("privacyAnalytics")}
        </p>
      </Section>

      <Section id="support" title={t("supportTitle")}>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("supportCost")}
        </p>
        {isPurchaseLocale(locale) ? (
          <>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {t("supportAffiliate")}
            </p>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {t.rich("supportIntegrity", {
                feedback: (chunks) => (
                  <FeedbackTrigger type="general">
                    {chunks}
                  </FeedbackTrigger>
                ),
              })}
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-600 leading-relaxed">
            {t("supportNoAffiliate")}
          </p>
        )}
        <div className="mt-2 rounded-2xl border border-zinc-200 p-5">
          <h3 className="mb-1 text-sm font-semibold text-zinc-900">{t("supportDirectTitle")}</h3>
          <SupportPanel />
        </div>
      </Section>

      <Section id="ack" title={t("ackTitle")}>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {t("ackBody")}
        </p>

        <div className="flex flex-col divide-y divide-zinc-100">
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
              />
            );
          })}
        </div>

        <div className="pt-6 border-t border-zinc-100 text-center">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {t("ackClosing")}
          </p>
        </div>
      </Section>
    </div>
  );
}
