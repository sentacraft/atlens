import Image from "next/image";
import { promoPageNumber, type PromoDeck, type PromoLens, type PromoPage } from "@/lib/promo-collection";
import type messages from "@/messages/en.json";
import { PromoEnd } from "./PromoEnd";
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
  const editorial = page.kind === "end" && deck.slug === "fisheye";
  const markSize = editorial ? 42 : 52;
  const layout = page.kind === "cover" ? styles.coverPoster : editorial ? styles.editorial : null;
  return (
    <article className={layout ? `${styles.poster} ${layout}` : styles.poster} lang="zh-CN">
      <header className={styles.header}>
        <span className={styles.wordmark}><Image src="/icons/icon-192.png" alt="" width={markSize} height={markSize} unoptimized loading="eager" />Atlens</span>
        <span>{labels.brandLine}</span>
      </header>
      {page.kind === "cover" && <>
        <p className={styles.coverMount}>{labels.mount}</p>
        <h2 className={styles.coverTitle}>{deck.title}</h2>
        <p className={styles.coverSubtitle}>{deck.subtitle}{deck.scope && <sup> *</sup>}</p>
        <div className={styles.coverImages} style={{ gridTemplateColumns: `repeat(${deck.cover.length}, minmax(0, 1fr))` }}>
          {deck.cover.map((lens) => <figure key={lens.id}><LensPhoto lens={lens} width={248} height={320} /><figcaption>{lens.caption ?? `${lens.brand} · ${lens.name}`}</figcaption></figure>)}
        </div>
        <footer className={styles.coverFooter}>
          <span><b>{deck.lensCount}</b> {labels.lensUnit}</span><span><b>{deck.brandCount}</b> {labels.brandUnit}</span>
          <span className={styles.coverPage}>{labels.focalOrder}<br />{number}</span>
          {deck.scope && <p className={styles.scope}>* {deck.scope}</p>}
        </footer>
      </>}
      {page.kind === "group" && <>
        <h2 className={styles.groupTitle}>{labels.equivalent} {page.range.replace("mm", " mm")}</h2>
        <p className={styles.groupSubtitle}>{compact ? null : `${labels.actual} ${page.groups[0].actual.replace("mm", " mm")} · `}{rowCount} {labels.lensUnit} · {labels[deck.theme.order]}</p>
        <div className={`${styles.row} ${styles.columns}`}><span>{labels.lens}</span>{deck.theme.columns.map((column) => <span key={column}>{labels[column]}</span>)}</div>
        {page.groups.map((group) => <section key={group.actual}>
          {group.lenses.map((lens) => <div key={lens.id} className={`${styles.row} ${styles.lensRow}`}>
            <span className={styles.thumb}><LensPhoto lens={lens} width={104} height={96} /></span>
            <div className={styles.identity}>
              <strong>{lens.name}</strong>
              <div className={styles.identityMeta}>
                <span>{lens.brand}</span><b>{lens.focus}</b>
                {lens.referencePrice && <span className={styles.referencePrice}>{labels.priceLabel} {lens.referencePrice}</span>}
              </div>
            </div>
            <div className={styles.measurements}>
              {deck.theme.columns.map((column, position) => {
                const value = lens[column];
                const unit = column === "length" ? "mm" : column === "weight" ? "g" : null;
                const specClass = position === 0 ? styles.primarySpec : styles.secondarySpec;
                return <span key={column} className={value.includes("–") ? `${specClass} ${styles.specRange}` : specClass}>
                  {value}{unit && value !== "—" && <> <small>{unit}</small></>}
                </span>;
              })}
            </div>
          </div>)}
        </section>)}
        <footer className={styles.footer}><span>{number}</span><span>{labels.focus}</span></footer>
      </>}
      {page.kind === "end" && <PromoEnd deck={deck} labels={labels} number={number} editorial={editorial} />}
    </article>
  );
}
