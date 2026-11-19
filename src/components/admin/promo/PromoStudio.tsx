"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { ACTION_PRIMARY_CLS } from "@/config/ui-tokens";
import { promoPageNumber, PROMO_WIDTH, PROMO_HEIGHT, type PromoDeck } from "@/lib/promo-collection";
import { exportPromoZip } from "@/lib/promo-export";
import { promoCollectionPath } from "@/lib/url/promo";
import { ADMIN_PATH } from "@/lib/url/routes";
import { promoPageTitle, PromoPoster, type PromoLabels } from "./PromoPoster";
import styles from "./promo-poster.module.css";

export function PromoStudio({ deck, options, labels }: {
  deck: PromoDeck;
  options: { slug: string; title: string }[];
  labels: PromoLabels;
}) {
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<"error" | "downloaded" | null>(null);
  const exportRoot = useRef<HTMLDivElement>(null);
  const pageTitles = deck.pages.map((page) => promoPageTitle(deck, page, labels));
  const exporting = progress !== null;

  async function download() {
    setStatus(null);
    flushSync(() => setProgress(0));
    try {
      const nodes = Array.from(exportRoot.current?.querySelectorAll<HTMLElement>(":scope > article") ?? []);
      if (nodes.length !== deck.pages.length) {throw new Error("Missing promo poster nodes");}
      await exportPromoZip(nodes, deck.slug, setProgress);
      setStatus("downloaded");
    } catch (error) {
      console.error("Promo export failed", error);
      setStatus("error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <main lang="zh-CN" className="mx-auto max-w-[1244px] px-4 pt-7 pb-12 sm:px-8">
      <nav className="flex items-center gap-2 text-sm text-zinc-600" aria-label={labels.title}>
        <Link href={ADMIN_PATH} className="underline underline-offset-4">Admin</Link><span aria-hidden="true">/</span><span aria-current="page">{labels.title}</span>
      </nav>
      <h1 className="mt-3.5 font-heading text-3xl font-bold sm:text-4xl">{labels.title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-zinc-600">{labels.intro}</p>
      <div className="grid items-start gap-5 md:grid-cols-[300px_minmax(0,1fr)]">
        <section className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5">
          <div><h2 className="font-semibold">{labels.settings}</h2><p className="mt-1 text-sm text-zinc-600">{labels.source}</p></div>
          <div className="grid gap-2 text-sm">
            <label htmlFor="promo-collection" className="font-semibold">{labels.collection}</label>
            <select id="promo-collection" value={deck.slug} disabled={exporting || navigating}
              onChange={(event) => {
                const path = promoCollectionPath(event.target.value);
                startTransition(() => router.replace(path, { scroll: false }));
              }} className="min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-2.5 focus-visible:outline-2 disabled:opacity-60">
              {options.map((option) => <option key={option.slug} value={option.slug}>{labels.mount} · {option.title}</option>)}
            </select>
            <p className="text-xs text-zinc-600">{deck.lensCount} {labels.lensUnit} · {deck.brandCount} {labels.brandUnit}</p>
          </div>
          <div className="border-t border-zinc-200 pt-4 text-sm">
            <h3 className="mb-2 font-semibold">{labels.preset}</h3>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"><strong>{labels.presetName}</strong><p className="mt-0.5 text-xs text-zinc-600">3:4 · {PROMO_WIDTH} × {PROMO_HEIGHT}</p></div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">{labels.rules}</p>
          </div>
          <div className="border-t border-zinc-200 pt-4 text-center text-sm">
            <button type="button" onClick={download} disabled={exporting || navigating} className={`${ACTION_PRIMARY_CLS} min-h-11 w-full justify-center rounded-lg disabled:cursor-default disabled:opacity-60`}>
              {exporting ? `${labels.busy} ${progress}/${deck.pages.length}` : `${labels.download} · ${deck.pages.length} PNG`}
            </button>
            <p className="mt-2 text-xs text-zinc-600">{labels.fileOrder}</p>
            <p aria-live="polite" className={status ? "mt-2 rounded-lg bg-zinc-50 p-2 text-zinc-700" : "sr-only"}>{status ? labels[status] : ""}</p>
          </div>
        </section>
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5" aria-busy={navigating}>
          <header className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{labels.preview}</h2><span className="text-xs text-zinc-600">{deck.pages.length} PNG</span></header>
          <div className="grid items-start gap-3 min-[850px]:grid-cols-[200px_minmax(0,1fr)] min-[850px]:gap-4">
            <div className="grid grid-cols-2 gap-1.5 min-[850px]:grid-cols-1">
              {pageTitles.map((title, index) => <button key={index} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}
                className="flex min-h-12 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1 text-left text-sm hover:bg-zinc-50 focus-visible:outline-2 aria-pressed:border-zinc-900 aria-pressed:bg-zinc-100 aria-pressed:font-semibold">
                <span className="text-xs text-zinc-600 tabular-nums">{promoPageNumber(index + 1)}</span>{title}
              </button>)}
            </div>
            <div className="flex min-w-0 flex-col items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-100 p-3 sm:p-4">
              <div className={`${styles.viewport} bg-white shadow-sm`}><div className={styles.previewScaled}><PromoPoster deck={deck} page={deck.pages[selected]} index={selected} labels={labels} /></div></div>
              <p aria-live="polite" className="text-xs text-zinc-600">{promoPageNumber(selected + 1)} / {promoPageNumber(deck.pages.length)} · {pageTitles[selected]}</p>
            </div>
          </div>
        </section>
      </div>
      {exporting && <div className="pointer-events-none fixed top-0 right-full" aria-hidden="true" ref={exportRoot}>
        {deck.pages.map((page, index) => <PromoPoster key={index} deck={deck} page={page} index={index} labels={labels} />)}
      </div>}
    </main>
  );
}
