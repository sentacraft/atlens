"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { createContext, useContext, type ReactNode } from "react";
import { MENU_POPUP_CLS, TEXT_LINK_CLS } from "@/config/ui-tokens";
import { sourceHref, type CitedSource, type MessageCitations } from "@/lib/askiris/review-citations";

const CitationsContext = createContext<MessageCitations | undefined>(undefined);

/** Gives the markdown of one message the numbers of the sources it cites. */
export function CitationsProvider({ citations, children }: { citations: MessageCitations; children: ReactNode }) {
  return <CitationsContext.Provider value={citations}>{children}</CitationsContext.Provider>;
}

function useSourceMeta(): (source: CitedSource["source"], withKind: boolean) => string {
  const t = useTranslations("AskIris.sources");
  return (source, withKind) =>
    [
      source.published,
      withKind ? t(source.kind === "measured" ? "measured" : "handsOn") : undefined,
      source.bodies?.join(t("bodiesSeparator")),
    ]
      .filter(Boolean)
      .join(" · ");
}

/** A citation marker: a superscript number that opens the source's card. Unknown keys render nothing. */
export function SourceMarker({ sourceKey }: { sourceKey: string }) {
  const t = useTranslations("AskIris.sources");
  const meta = useSourceMeta();
  const cited = useContext(CitationsContext)?.byKey.get(sourceKey);
  if (!cited) {
    return null;
  }
  const href = sourceHref(cited.source);
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("marker", { number: String(cited.number), site: cited.source.site })}
        className="not-prose relative mx-px inline-flex min-w-4 -translate-y-1.5 items-center after:absolute after:-inset-2 after:content-[''] justify-center rounded bg-zinc-100 px-1 align-baseline text-[10px] leading-4 font-semibold text-zinc-600 outline-none transition-colors hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-400 data-[popup-open]:bg-zinc-900 data-[popup-open]:text-white"
      >
        {cited.number}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6} collisionPadding={12}>
          <Popover.Popup className={`${MENU_POPUP_CLS} flex w-64 flex-col gap-1 px-3 py-2.5`}>
            <span className="text-sm font-semibold text-zinc-900">{cited.source.site}</span>
            <span className="text-xs text-zinc-500">{meta(cited.source, true)}</span>
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
  const meta = useSourceMeta();
  if (list.length === 0) {
    return null;
  }
  return (
    <div className="mt-1 w-full border-t border-zinc-100 px-1 pt-2">
      <p className="text-[11px] leading-4 text-zinc-500">{t("title")}</p>
      <ol className="mt-1 flex flex-col gap-0.5 text-[11px] leading-4">
        {list.map(({ number, key, source }) => {
          const href = sourceHref(source);
          return (
            <li key={key} className="flex min-h-6 items-baseline gap-1.5 sm:min-h-0">
              <span className="min-w-3.5 text-center font-semibold text-zinc-600">{number}</span>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={TEXT_LINK_CLS}>
                  {source.site}
                </a>
              ) : (
                <span className="text-zinc-700">{source.site}</span>
              )}
              <span className="text-zinc-500">{meta(source, false)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
