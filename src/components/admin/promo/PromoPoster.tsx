import Image from "next/image";
import { promoPageNumber, type PromoDeck, type PromoLens, type PromoPage } from "@/lib/promo-collection";
import type messages from "@/messages/en.json";
import { PromoEnd } from "./PromoEnd";
import { PromoOpticalEnd } from "./PromoOpticalEnd";
import styles from "./promo-poster.module.css";

export type PromoLabels = Record<keyof typeof messages.PromoStudio, string>;

export function promoPageTitle(deck: PromoDeck, page: PromoPage, labels: PromoLabels) {
  if (page.kind !== "group") {return labels[page.kind];}
  if (page.focus) {return labels[page.focus];}
  if (page.zoom) {return labels.zooms;}
  if (deck.theme.groupBy === "collection") {return deck.title;}
  return `${labels.equivalent} ${page.range.replace("mm", " mm")}`;
}

function LensPhoto({ lens, width, height }: { lens: PromoLens; width: number; height: number }) {
  return <Image src={lens.image} alt="" width={width} height={height} unoptimized loading="eager" />;
}

export type PromoEndStyle = "optical" | "detailed";

export function PromoPoster({ deck, page, index, labels, endStyle }: {
  deck: PromoDeck; page: PromoPage; index: number; labels: PromoLabels; endStyle: PromoEndStyle;
}) {
  const number = `${promoPageNumber(index + 1)} / ${promoPageNumber(deck.pages.length)}`;
  const rowCount = page.kind === "group" ? page.groups.reduce((n, group) => n + group.lenses.length, 0) : 0;
  const listing = page.kind === "group" && page.zoom ? deck.theme.zoom ?? deck.theme : deck.theme;
  const showActual = page.kind === "group" && page.groups.length === 1 && !listing.groupBy;
  const showInlinePrice = !listing.columns.includes("referencePrice");
  const coverOrder = deck.theme.zoom ? labels.lensTypeOrder : deck.theme.groupBy === "focus" ? labels.focusOrder
    : deck.theme.groupBy === "collection" ? labels[deck.theme.order] : labels.focalOrder;
  const optical = page.kind === "end" && endStyle === "optical";
  const editorial = page.kind === "end" && !optical && deck.slug === "fisheye";
  const markSize = optical || editorial ? 42 : 52;
  const layout = page.kind === "cover" ? styles.coverPoster : optical ? styles.optical : editorial ? styles.editorial : null;
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
          <span className={styles.coverPage}>{coverOrder}<br />{number}</span>
          {deck.scope && <p className={styles.scope}>* {deck.scope}</p>}
        </footer>
      </>}
      {page.kind === "group" && <>
        <h2 className={styles.groupTitle}>{promoPageTitle(deck, page, labels)}</h2>
        <p className={styles.groupSubtitle}>{page.focus || page.zoom ? `${deck.title} · ` : deck.theme.zoom ? `${labels.primes} · ` : null}{showActual && `${labels.actual} ${page.groups[0].actual.replace("mm", " mm")} · `}{rowCount} {labels.lensUnit}{listing.order && ` · ${labels[listing.order]}`}</p>
        <div className={`${styles.row} ${styles.columns}`}><span>{labels.lens}</span>{listing.columns.map((column) => <span key={column}>{column === "referencePrice" ? labels.priceLabel : labels[column]}</span>)}</div>
        {page.groups.map((group) => <section key={group.lenses[0].id}>
          {group.lenses.map((lens) => <div key={lens.id} className={`${styles.row} ${styles.lensRow}`}>
            <span className={styles.thumb}><LensPhoto lens={lens} width={104} height={96} /></span>
            <div className={styles.identity}>
              <strong>{lens.name}</strong>
              <div className={styles.identityMeta}>
                <span>{lens.brand}</span><b>{lens.focus}</b>
                {showInlinePrice && lens.referencePrice && <span className={styles.referencePrice}>{labels.priceLabel} {lens.referencePrice}</span>}
              </div>
            </div>
            <div className={styles.measurements}>
              {listing.columns.map((column, position) => {
                const value = lens[column] ?? "—";
                const unit = column === "length" || column === "focal" ? "mm" : column === "weight" ? "g" : null;
                const specClass = position === 0 ? styles.primarySpec : styles.secondarySpec;
                const upperWeight = column === "weight" ? value.split("–")[1] : undefined;
                if (upperWeight) {
                  return <span key={column} className={`${specClass} ${styles.weightRange}`}>
                    <span>≤ {upperWeight} <small>g</small></span>
                    <small className={styles.weightDetail}>{value} g</small>
                  </span>;
                }
                return <span key={column} className={value.includes("–") ? `${specClass} ${styles.specRange}` : specClass}>
                  {value}{unit && value !== "—" && <> <small>{unit}</small></>}
                </span>;
              })}
            </div>
          </div>)}
        </section>)}
        <footer className={styles.footer}><span>{number}</span><span>{showInlinePrice ? labels.focus : labels.budgetPriceNotice}</span></footer>
      </>}
      {page.kind === "end" && (optical ? <PromoOpticalEnd catalog={deck.catalog} labels={labels} number={number} />
        : <PromoEnd deck={deck} labels={labels} number={number} editorial={editorial} />)}
    </article>
  );
}
