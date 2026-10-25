"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";
import { MENU_POPUP_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { publishedMonth, sourceHref, type CitedSource, type Citations } from "@/lib/askiris/review-citations";
import { cn } from "@/lib/utils";

const CitationsContext = createContext<Citations | undefined>(undefined);

/** Gives the markdown of one message the numbers of the sources it cites. */
export function CitationsProvider({ citations, children }: { citations: Citations; children: ReactNode }) {
  return <CitationsContext.Provider value={citations}>{children}</CitationsContext.Provider>;
}

/** How a source reads to a visitor: when it was published, how it tested, and on which bodies. */
export function useSourceFacts(): (source: CitedSource["source"]) => { when?: string; how: string; bodies?: string } {
  const t = useTranslations("AskIris.sources");
  const format = useFormatter();
  return (source) => {
    const month = source.published ? publishedMonth(source.published) : undefined;
    return {
      when: month ? format.dateTime(month, { year: "numeric", month: "long" }) : source.published,
      how: t(source.kind === "measured" ? "measured" : "handsOn"),
      bodies: source.bodies?.length ? t("testedOn", { bodies: source.bodies.join(t("bodiesSeparator")) }) : undefined,
    };
  };
}

/** A source's number as its markers show it, for lists and cards that name the source. */
export function SourceNumber({ number, emphasis = false }: { number: number; emphasis?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-4 shrink-0 items-center justify-center rounded px-1 text-[10px] leading-4 font-semibold",
        emphasis ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600",
      )}
    >
      {number}
    </span>
  );
}

/** A citation marker: a superscript number that opens the source's card. Unknown keys render nothing. */
export function SourceMarker({ sourceKey }: { sourceKey: string }) {
  const t = useTranslations("AskIris.sources");
  const facts = useSourceFacts();
  const cited = useContext(CitationsContext)?.byKey.get(sourceKey);
  if (!cited) {
    return null;
  }
  const href = sourceHref(cited.source);
  const { when, how, bodies } = facts(cited.source);
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("marker", { number: String(cited.number), site: cited.source.site })}
        className="not-prose relative mx-px inline-flex min-w-4 -translate-y-1.5 items-center after:absolute after:-inset-x-px after:-inset-y-2 after:content-[''] justify-center rounded bg-zinc-100 px-1 align-baseline text-[10px] leading-4 font-semibold text-zinc-600 outline-none transition-colors hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-400 data-[popup-open]:bg-zinc-900 data-[popup-open]:text-white"
      >
        {cited.number}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6} collisionPadding={12}>
          <Popover.Popup className={`${MENU_POPUP_CLS} flex w-64 flex-col gap-1 px-3 py-2.5`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <SourceNumber number={cited.number} emphasis />
              {cited.source.site}
            </span>
            <span className="text-xs text-zinc-500">{[when, how].filter(Boolean).join(" · ")}</span>
            {bodies ? <span className="text-xs text-zinc-500">{bodies}</span> : null}
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex min-h-8 items-center gap-1 self-start text-[13px] font-medium text-zinc-900 hover:text-zinc-600"
              >
                {t("readOriginal")}
                <ArrowUpRight className="size-3.5 text-zinc-500" aria-hidden />
              </a>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The sources a reply cited or fetched, numbered as its markers are. */
export function SourceList({ list }: { list: CitedSource[] }) {
  const t = useTranslations("AskIris.sources");
  const facts = useSourceFacts();
  if (list.length === 0) {
    return null;
  }
  return (
    <div className="mt-1 w-full border-t border-zinc-100 px-1 pt-2">
      <p className="text-[11px] leading-4 text-zinc-500">{t("title")}</p>
      <ol className="mt-1 flex flex-col gap-0.5 text-[11px] leading-4">
        {list.map(({ number, key, source }) => {
          const href = sourceHref(source);
          const { when, bodies } = facts(source);
          return (
            <li key={key} className="flex min-h-5 items-baseline gap-1.5 sm:min-h-0">
              <span className="min-w-3.5 text-center font-semibold text-zinc-600">{number}</span>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={TEXT_LINK_CLS}>
                  {source.site}
                </a>
              ) : (
                <span className="text-zinc-700">{source.site}</span>
              )}
              <span className="text-zinc-500">{[when, bodies].filter(Boolean).join(" · ")}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
