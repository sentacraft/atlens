import Image from "next/image";
import { promoPageNumber, type PromoDeck, type PromoLens, type PromoPage } from "@/lib/promo-collection";
import type messages from "@/messages/en.json";
import styles from "./promo-poster.module.css";

export type PromoLabels = Record<keyof typeof messages.PromoStudio, string>;

function LensPhoto({ lens, width, height }: { lens: PromoLens; width: number; height: number }) {
  return <Image src={lens.image} alt="" width={width} height={height} unoptimized loading="eager" />;
}

export function PromoPoster({ deck, page, index, labels }: {
  deck: PromoDeck; page: PromoPage; index: number; labels: PromoLabels;
}) {
  const number = `${promoPageNumber(index + 1)} / ${promoPageNumber(deck.pages.length)}`;
  const rowCount = page.kind === "group" ? page.groups.reduce((n, group) => n + group.lenses.length, 0) : 0;
  const compact = page.kind === "group" && page.groups.length > 1;
  const brandLine = page.kind === "group" ? `${labels.mount} · ${deck.collectionTitle}` : labels.brandLine;
  return (
    <article className={styles.poster} lang="zh-CN">
      <header className={styles.header}>
        <span className={styles.wordmark}><Image src="/icons/icon-192.png" alt="" width={48} height={48} unoptimized loading="eager" />Atlens</span>
        <span>{brandLine}</span>
      </header>
      {page.kind === "cover" && <>
        <div className={styles.coverKicker}>{labels.mount}</div>
        <h2 className={styles.coverTitle}>{deck.title}</h2>
        <p className={styles.coverSubtitle}>{deck.subtitle}</p>
        {deck.scope && <p className={styles.scope}>{deck.scope}</p>}
        <div className={styles.coverImages} style={{ gridTemplateColumns: `repeat(${deck.cover.length}, minmax(0, 1fr))` }}>
          {deck.cover.map((lens) => <figure key={lens.id}><LensPhoto lens={lens} width={248} height={310} /><figcaption>{lens.brand} · {lens.name}</figcaption></figure>)}
        </div>
        <footer className={styles.coverFooter}>
          <span><b>{deck.lensCount}</b> {labels.lensUnit}</span><span><b>{deck.brandCount}</b> {labels.brandUnit}</span>
          <span className={styles.coverPage}>{labels.focalOrder}<br />{number}</span>
        </footer>
      </>}
      {page.kind === "group" && <>
        <h2 className={styles.groupTitle}>{labels.equivalent} <span>{page.range.replace("mm", " mm")}</span></h2>
        <p className={styles.groupSubtitle}>{compact ? null : `${labels.actual} ${page.groups[0].actual.replace("mm", " mm")} · `}{rowCount} {labels.lensUnit} · {labels.thinOrder}</p>
        <div className={`${styles.row} ${styles.columns}`}><span /><span>{labels.lens}</span><span>{labels.length}</span><span>{labels.weight}</span></div>
        {page.groups.map((group) => <section key={group.actual}>
          {group.lenses.map((lens) => <div key={lens.id} className={`${styles.row} ${styles.lensRow}`}>
            <span className={styles.thumb}><LensPhoto lens={lens} width={104} height={96} /></span>
            <div className={styles.identity}><strong>{lens.name}</strong><span>{lens.brand} <b>{lens.focus}</b></span></div>
            <b className={styles.length}>{lens.length}{lens.length !== "—" && <> <small>mm</small></>}</b>
            <span className={styles.weight}>{lens.weight}{lens.weight !== "—" && <> <small>g</small></>}</span>
          </div>)}
        </section>)}
        <footer className={styles.footer}><span>{number}</span><span>{labels.focus}</span></footer>
      </>}
      {page.kind === "end" && <>
        <h2 className={styles.endTitle}>{deck.slug === "pancake" ? labels.morePancake : labels.more}</h2>
        <p className={styles.coverSubtitle}>{labels.moreSubtitle}</p>
        <ol className={styles.related}>
          {deck.related.map((related, i) => <li key={related.title}><span>{promoPageNumber(i + 1)}</span><strong>{related.title}</strong><span>{related.description}</span></li>)}
        </ol>
        <div className={styles.features}>{labels.reference}<br />{labels.compare}</div>
        <footer className={styles.footer}>{number}</footer>
      </>}
    </article>
  );
}
