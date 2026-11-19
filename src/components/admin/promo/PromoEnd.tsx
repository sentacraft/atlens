import Image from "next/image";
import { Aperture, BookOpen, Feather, RectangleHorizontal, Weight } from "lucide-react";
import AiTag from "@/components/iris/AiTag";
import { SITE } from "@/config/site";
import type { PromoDeck } from "@/lib/promo-collection";
import type { PromoLabels } from "./PromoPoster";
import styles from "./promo-poster.module.css";

function Measurement({ value, unit, compact }: { value: string; unit: string; compact: boolean }) {
  if (value === "—") {return value;}
  return compact ? <>{value}<small>{unit}</small></> : `${value} ${unit}`;
}

export function PromoEnd({ deck, labels, number, editorial }: {
  deck: PromoDeck; labels: PromoLabels; number: string; editorial: boolean;
}) {
  const title = editorial ? labels.moreFisheye : deck.slug === "pancake" ? labels.morePancake : labels.more;
  const stats = `${deck.catalog.brands} ${labels.brandUnit} · ${deck.catalog.lenses} ${labels.lensUnit}`;
  return <>
    <h2 className={styles.endTitle}>{title}</h2>
    <p className={styles.endStats}>{stats}{!editorial && ` · ${deck.catalog.themes} ${labels.themeUnit}`}</p>
    <section className={editorial ? styles.themeSection : undefined}>
      {editorial && <div className={styles.themeHeading}>
        <h3>{labels.themesTitle}</h3><span>{labels.themesCount.replace("{count}", String(deck.catalog.themes))}</span>
      </div>}
      <ul className={styles.related}>
        {deck.related.map((item) => {
          const Icon = editorial ? (item.slug === "under-200g" ? Weight : RectangleHorizontal)
            : item.slug === "under-200g" ? Feather : item.slug === "fast-aperture-primes" ? Aperture : BookOpen;
          return <li key={item.slug}>
            <Icon size={editorial ? 34 : 44} strokeWidth={editorial ? 1.45 : 1.6} aria-hidden="true" />
            <div><strong>{item.title}</strong><p>{item.count} {editorial ? labels.itemUnit : labels.lensUnit} · {item.description}</p></div>
          </li>;
        })}
      </ul>
    </section>
    <section className={styles.iris} aria-label="Iris">
      <div>
        <div className={styles.irisName}>
          <Image src="/icons/icon-192.png" alt="" width={editorial ? 34 : 38} height={editorial ? 34 : 38} unoptimized loading="eager" />
          <span>Iris</span><AiTag className={styles.irisTag} />
        </div>
        <p><span>{labels.irisIntro}</span>{editorial && <br />}<strong>{editorial ? labels.irisHelpEditorial : labels.irisHelp}</strong></p>
      </div>
      <div className={styles.bubbles}><p>{labels.irisNight}</p><p>{labels.irisStreet}</p></div>
    </section>
    <section className={styles.endCompare}>
      <h3>{labels.compare}</h3>
      {deck.comparison.length === 2 && <table>
        <thead><tr><td />{deck.comparison.map((lens) => <th key={lens.id} scope="col">
          <Image src={lens.image} alt="" width={editorial ? 202 : 200} height={editorial ? 120 : 143} unoptimized loading="eager" /><span>{lens.name}</span>
        </th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">{labels.length}</th>{deck.comparison.map((lens) => <td key={lens.id}><Measurement value={lens.length} unit="mm" compact={editorial} /></td>)}</tr>
          <tr><th scope="row">{labels.weight}</th>{deck.comparison.map((lens) => <td key={lens.id}><Measurement value={lens.weight} unit="g" compact={editorial} /></td>)}</tr>
        </tbody>
      </table>}
      <p>{editorial ? labels.editorialFeatures : `${labels.reference} · ${labels.opticalImages}`}</p>
    </section>
    <footer className={styles.endFooter}>
      <div><p>{labels.visit}</p><strong>{SITE.host}</strong></div>
      <span>{number}</span>
    </footer>
  </>;
}
