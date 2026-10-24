"use client";

import { Popover } from "@base-ui/react/popover";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleAlert, CircleCheck, Clock, MessagesSquare, type LucideProps } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { CitationsProvider, SourceList, SourceMarker } from "@/components/askiris/ReviewSources";
import {
  MENU_POPUP_CLS,
  PAGE_SECTION_CLS,
  REVIEW_NEGATIVE_CLS,
  REVIEW_POSITIVE_CLS,
  SECTION_HEADING_CLS,
} from "@/config/ui-tokens";
import { numberSources, sourceHref, type Citations } from "@/lib/askiris/review-citations";
import { lensReviewsQuery } from "@/lib/lens/reviews-client";
import { layoutReviews, type ReviewClaimView } from "@/lib/lens/reviews-view";
import { cn } from "@/lib/utils";

// A ring with its right half filled, drawn like the Lucide circles beside it; Lucide's Contrast nests a second ring.
function HalfFilledCircle(props: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20z" fill="currentColor" />
    </svg>
  );
}

const POLARITY_ICON = {
  positive: { Icon: CircleCheck, cls: REVIEW_POSITIVE_CLS },
  negative: { Icon: CircleAlert, cls: REVIEW_NEGATIVE_CLS },
  mixed: { Icon: HalfFilledCircle, cls: "text-zinc-500" },
} as const;

const QUIET_TRIGGER_CLS =
  "text-xs text-zinc-500 underline decoration-zinc-300 decoration-dotted underline-offset-[3px] outline-none hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-400";

function PolarityIcon({ polarity, className }: { polarity: ReviewClaimView["polarity"]; className?: string }) {
  const t = useTranslations("LensReviews.findings");
  const { Icon, cls } = POLARITY_ICON[polarity];
  return <Icon role="img" aria-label={t(`polarity.${polarity}`)} className={cn("size-4 shrink-0", cls, className)} />;
}

/** The review count after a finding; it opens the list of the reviews behind it. */
function ReviewsButton({ claim, citations }: { claim: ReviewClaimView; citations: Citations }) {
  const t = useTranslations("LensReviews.findings");
  const cited = claim.sources.map((id) => citations.byKey.get(id)).filter((entry) => entry !== undefined);
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("reviewSources", { count: claim.reviewCount, aspect: t(`aspects.${claim.aspect}`) })}
        className={cn(QUIET_TRIGGER_CLS, "ml-1.5 whitespace-nowrap")}
      >
        {t("reviewCount", { count: claim.reviewCount })}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} collisionPadding={12}>
          <Popover.Popup className={cn(MENU_POPUP_CLS, "w-72 py-1.5")}>
            <ul>
              {cited.map(({ key, source }) => {
                const href = sourceHref(source);
                const meta = [source.published, source.bodies?.join(", ")].filter(Boolean).join(" · ");
                const body = (
                  <>
                    <span className="font-medium text-zinc-900">{source.site}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-500">{meta}</span>
                    {href ? <ArrowUpRight className="size-3 shrink-0 text-zinc-400" aria-hidden /> : null}
                  </>
                );
                return (
                  <li key={key}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center gap-2 px-3 text-[13px] hover:bg-zinc-50">
                        {body}
                      </a>
                    ) : (
                      <span className="flex min-h-9 items-center gap-2 px-3 text-[13px]">{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** A clock after a finding whose sources may not hold on current bodies; it opens the reason. */
function StaleHint({ claim }: { claim: ReviewClaimView }) {
  const t = useTranslations("LensReviews.findings");
  if (claim.staleness.length === 0 && !claim.otherMount) {
    return null;
  }
  const notes = [...claim.staleness.map((reason) => t(`staleness.${reason}`)), ...(claim.otherMount ? [t("otherMount")] : [])];
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={notes.join("; ")}
        className="relative ml-1.5 inline-flex align-[-2px] text-zinc-400 outline-none after:absolute after:-inset-2 hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <Clock className="size-3.5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6} collisionPadding={12}>
          <Popover.Popup className={cn(MENU_POPUP_CLS, "max-w-64 px-3 py-2 text-xs leading-relaxed text-zinc-700")}>
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CollapsedRow({ claim, citations }: { claim: ReviewClaimView; citations: Citations }) {
  const t = useTranslations("LensReviews.findings");
  return (
    <li className="flex flex-col gap-0.5 border-b border-zinc-100 py-2.5 last:border-b-0">
      <span className="text-xs text-zinc-500">{t(`aspects.${claim.aspect}`)}</span>
      <p className="text-sm leading-[22px] text-zinc-800">
        {claim.text}
        <ReviewsButton claim={claim} citations={citations} />
        <StaleHint claim={claim} />
      </p>
    </li>
  );
}

function ExpandedRow({ claim }: { claim: ReviewClaimView }) {
  const t = useTranslations("LensReviews.findings");
  const [open, setOpen] = useState(false);
  return (
    <li className="flex gap-2.5 border-b border-zinc-100 py-3 last:border-b-0">
      <PolarityIcon polarity={claim.polarity} className="mt-[3px]" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-zinc-500">{t(`aspects.${claim.aspect}`)}</span>
        <p className="text-sm leading-[22px] text-zinc-800">
          {claim.text}
          {claim.sources.map((id) => (
            <SourceMarker key={id} sourceKey={id} />
          ))}
          <StaleHint claim={claim} />
        </p>
        {claim.details.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="self-start text-xs text-zinc-500 hover:text-zinc-900"
          >
            {open ? t("hideDetails") : t("showDetails", { count: String(claim.details.length) })}
          </button>
        ) : null}
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

function SideList({
  polarity,
  claims,
  citations,
}: {
  polarity: "positive" | "negative";
  claims: ReviewClaimView[];
  citations: Citations;
}) {
  const t = useTranslations("LensReviews.findings");
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
        <PolarityIcon polarity={polarity} />
        <h3 className="text-sm font-semibold text-zinc-900">{t(polarity === "positive" ? "pros" : "cons")}</h3>
      </div>
      <ul>
        {claims.map((claim) => (
          <CollapsedRow key={claim.aspect + claim.text} claim={claim} citations={citations} />
        ))}
      </ul>
    </div>
  );
}

/** What published reviews say about the lens, collapsed to its strengths and weaknesses. Renders nothing without findings. */
export default function LensReviewSummary({ lensId }: { lensId: string }) {
  const locale = useLocale();
  const t = useTranslations("LensReviews.findings");
  const format = useFormatter();
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
  const disputed = layout.groups
    .flatMap(({ claims }) => claims)
    .filter((claim) => claim.agreement === "conflict")
    .map((claim) => t(`aspects.${claim.aspect}`).toLowerCase());

  return (
    <section aria-labelledby="lens-review-findings" data-nosnippet="" className={cn(PAGE_SECTION_CLS, "flex flex-col gap-4")}>
      <div className="flex flex-col gap-1">
        <h2 id="lens-review-findings" className={SECTION_HEADING_CLS}>{t("title")}</h2>
        <p className="text-[13px] text-zinc-500">{t("subtitle", { count: String(citations.list.length) })}</p>
      </div>
      <CitationsProvider citations={citations}>
        {layout.summary.map((claim) => (
          <div key={claim.aspect} className="flex items-start gap-2.5 rounded-xl bg-zinc-50 px-3.5 py-3">
            <PolarityIcon polarity={claim.polarity} className="mt-[3px]" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-zinc-500">
                {claim.aspect === "overall" ? t("summary") : t("aspects.award")}
                {claim.agreement === "conflict" ? ` · ${t("conflict")}` : ""}
              </span>
              <p className="text-sm leading-[22px] text-zinc-800">
                {claim.text}
                <ReviewsButton claim={claim} citations={citations} />
              </p>
            </div>
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
                    <ExpandedRow key={claim.aspect + claim.text} claim={claim} />
                  ))}
                </ul>
              </div>
            ))}
            <SourceList list={citations.list} />
          </>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
            {layout.pros.length > 0 ? <SideList polarity="positive" claims={layout.pros} citations={citations} /> : null}
            {layout.cons.length > 0 ? <SideList polarity="negative" claims={layout.cons} citations={citations} /> : null}
          </div>
        )}
      </CitationsProvider>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {!expanded && disputed.length > 0 ? (
          <p className="flex items-center gap-1.5 text-[13px] text-zinc-600">
            <MessagesSquare className="size-3.5 shrink-0 text-zinc-500" aria-hidden />
            {t("disagree", { aspects: format.list(disputed, { type: "conjunction" }) })}
          </p>
        ) : (
          <span className="hidden sm:block" />
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
