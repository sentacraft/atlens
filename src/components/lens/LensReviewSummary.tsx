"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CitationsProvider, SourceList, SourceMarker } from "@/components/askiris/ReviewSources";
import { PAGE_SECTION_CLS, SECTION_HEADING_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { numberSources, sourceHref } from "@/lib/askiris/review-citations";
import { lensReviewsQuery } from "@/lib/lens/reviews-client";
import { layoutReviews, type ReviewClaimView } from "@/lib/lens/reviews-view";
import { cn } from "@/lib/utils";

const MARK = { positive: "+", negative: "−", mixed: "±" } as const;
const MARK_CLS = { positive: "text-zinc-900", negative: "text-zinc-500", mixed: "text-zinc-600" } as const;
const TAG_CLS = "rounded-full bg-zinc-100 px-2 py-px text-[11px] font-medium whitespace-nowrap text-zinc-700";

function Markers({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => (
        <SourceMarker key={id} sourceKey={id} />
      ))}
    </>
  );
}

function ClaimMeta({ claim }: { claim: ReviewClaimView }) {
  const t = useTranslations("LensReviews.findings");
  return (
    <>
      <span>
        {claim.reviewCount === 1
          ? t("weightSingle")
          : t("weight", { reviews: String(claim.reviewCount), outlets: String(claim.outletCount) })}
      </span>
      {claim.staleness.map((reason) => (
        <span key={reason} className={TAG_CLS}>
          {t(`staleness.${reason}`)}
        </span>
      ))}
      {claim.otherMount ? <span className={TAG_CLS}>{t("otherMount")}</span> : null}
    </>
  );
}

function ClaimRow({ claim }: { claim: ReviewClaimView }) {
  const t = useTranslations("LensReviews.findings");
  const [open, setOpen] = useState(false);
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2 border-b border-zinc-100 py-3 last:border-b-0 sm:grid-cols-[6rem_1rem_minmax(0,1fr)] sm:gap-x-2.5">
      <span className="col-span-2 text-xs text-zinc-500 sm:col-span-1 sm:text-[13px] sm:leading-[22px]">
        {t(`aspects.${claim.aspect}`)}
      </span>
      <span aria-label={t(`polarity.${claim.polarity}`)} className={cn("text-center text-[13px] leading-[22px] font-semibold", MARK_CLS[claim.polarity])}>
        {MARK[claim.polarity]}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm leading-[22px] text-zinc-800">
          {claim.text}
          <Markers ids={claim.sources} />
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <ClaimMeta claim={claim} />
          {claim.details.length > 0 ? (
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="text-zinc-700 hover:text-zinc-900">
              {open ? t("hideDetails") : t("showDetails", { count: String(claim.details.length) })}
            </button>
          ) : null}
        </div>
        {open ? (
          <ul className="mt-1 flex flex-col gap-1.5 rounded-lg bg-zinc-50 px-3 py-2 text-[13px] leading-5 text-zinc-700">
            {claim.details.map((detail, i) => (
              <li key={i}>
                {detail.text}
                <SourceMarker sourceKey={detail.id} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function SideList({ title, polarity, claims }: { title: string; polarity: "positive" | "negative"; claims: ReviewClaimView[] }) {
  const t = useTranslations("LensReviews.findings");
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-baseline gap-1.5 border-b border-zinc-200 pb-1.5">
        <span aria-hidden className={cn("text-[13px] font-semibold", MARK_CLS[polarity])}>
          {MARK[polarity]}
        </span>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <ul>
        {claims.map((claim) => (
          <li key={claim.aspect} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-2.5 border-b border-zinc-100 py-2 text-sm leading-[22px] last:border-b-0">
            <span className="text-xs leading-[22px] text-zinc-500">{t(`aspects.${claim.aspect}`)}</span>
            <span className="text-zinc-800">
              {claim.text}
              <Markers ids={claim.sources} />
              {claim.staleness.length > 0 ? <span className={cn(TAG_CLS, "ml-1.5")}>{t(`staleness.${claim.staleness[0]}`)}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What published reviews say about the lens, collapsed to its strengths and weaknesses. Renders nothing without findings. */
export default function LensReviewSummary({ lensId }: { lensId: string }) {
  const locale = useLocale();
  const t = useTranslations("LensReviews.findings");
  const { data } = useQuery(lensReviewsQuery(lensId, locale));
  const [expanded, setExpanded] = useState(false);
  const layout = useMemo(() => (data ? layoutReviews(data) : null), [data]);
  const citations = useMemo(
    () => (data && layout ? numberSources(layout.sourceOrder, data.sources) : null),
    [data, layout],
  );
  if (!data || !layout || !citations || layout.total === 0) {
    return null;
  }

  return (
    <section aria-labelledby="lens-review-findings" data-nosnippet="" className={cn(PAGE_SECTION_CLS, "flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <h2 id="lens-review-findings" className={SECTION_HEADING_CLS}>{t("title")}</h2>
        <p className="text-[13px] text-zinc-500">{t("subtitle", { count: String(citations.list.length) })}</p>
      </div>
      <CitationsProvider citations={citations}>
        {layout.summary.map((claim) => (
          <div key={claim.aspect} className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-2.5">
            <span className={cn(TAG_CLS, "self-start")}>
              {claim.aspect === "overall" ? t("summary") : t("aspects.award")}
              {claim.agreement === "conflict" ? ` · ${t("conflict")}` : ""}
            </span>
            <p className="text-sm leading-[22px] text-zinc-800">
              {claim.text}
              <Markers ids={claim.sources} />
            </p>
          </div>
        ))}

        {expanded ? (
          <>
            {layout.groups.map(({ group, claims }) => (
              <div key={group} className="flex flex-col">
                <div className="flex items-baseline gap-1.5 border-b border-zinc-200 pb-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{t(`groups.${group}`)}</h3>
                  <span className="text-xs text-zinc-500">{t("count", { count: String(claims.length) })}</span>
                </div>
                <ul>
                  {claims.map((claim) => (
                    <ClaimRow key={claim.aspect + claim.text} claim={claim} />
                  ))}
                </ul>
              </div>
            ))}
            <SourceList list={citations.list} />
          </>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-7">
            {layout.pros.length > 0 ? <SideList title={t("pros")} polarity="positive" claims={layout.pros} /> : null}
            {layout.cons.length > 0 ? <SideList title={t("cons")} polarity="negative" claims={layout.cons} /> : null}
          </div>
        )}
      </CitationsProvider>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {expanded ? null : (
          <p className="text-[11px] leading-4 text-zinc-500">
            {t("sourcesLead")}
            {citations.list.map(({ number, key, source }, i) => {
              const href = sourceHref(source);
              return (
                <span key={key}>
                  {i > 0 ? " · " : ""}
                  {number}{" "}
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className={TEXT_LINK_CLS}>
                      {source.site}
                    </a>
                  ) : (
                    source.site
                  )}
                </span>
              );
            })}
          </p>
        )}
        {layout.total > layout.pros.length + layout.cons.length ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="min-h-11 shrink-0 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:min-h-8"
          >
            {expanded ? t("collapse") : t("expand", { count: String(layout.total) })}
          </button>
        ) : null}
      </div>
    </section>
  );
}
