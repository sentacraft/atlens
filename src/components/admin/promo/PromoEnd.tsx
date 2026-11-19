import Image from "next/image";
import { Aperture, BookOpen, Feather } from "lucide-react";
import AiTag from "@/components/iris/AiTag";
import { SITE } from "@/config/site";
import type { PromoDeck } from "@/lib/promo-collection";
import type { PromoLabels } from "./PromoPoster";
import styles from "./promo-poster.module.css";

export function PromoEnd({ deck, labels, number }: { deck: PromoDeck; labels: PromoLabels; number: string }) {
  return <>
    <h2 className={styles.endTitle}>{deck.slug === "pancake" ? labels.morePancake : labels.more}</h2>
    <p className={styles.endStats}>{deck.catalog.brands} {labels.brandUnit} · {deck.catalog.lenses} {labels.lensUnit} · {deck.catalog.themes} {labels.themeUnit}</p>
    <ul className={styles.related}>
      {deck.related.map((item) => {
        const Icon = item.slug === "under-200g" ? Feather : item.slug === "fast-aperture-primes" ? Aperture : BookOpen;
        return <li key={item.slug}>
          <Icon size={44} strokeWidth={1.6} aria-hidden="true" />
          <div><strong>{item.title}</strong><p>{item.count} {labels.lensUnit} · {item.description}</p></div>
        </li>;
      })}
    </ul>
    <section className={styles.iris} aria-label="Iris">
      <div>
        <div className={styles.irisName}>
          <Image src="/icons/icon-192.png" alt="" width={38} height={38} unoptimized loading="eager" />
          <span>Iris</span><AiTag className={styles.irisTag} />
        </div>
        <p>{labels.irisIntro}<strong>{labels.irisHelp}</strong></p>
      </div>
      <div className={styles.bubbles}><p>{labels.irisNight}</p><p>{labels.irisStreet}</p></div>
    </section>
    <section className={styles.endCompare}>
      <h3>{labels.compare}</h3>
      {deck.comparison.length === 2 && <table>
        <thead><tr><td />{deck.comparison.map((lens) => <th key={lens.id} scope="col">
          <Image src={lens.image} alt="" width={200} height={143} unoptimized loading="eager" />{lens.name}
        </th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">{labels.length}</th>{deck.comparison.map((lens) => <td key={lens.id}>{lens.length}{lens.length === "—" ? "" : " mm"}</td>)}</tr>
          <tr><th scope="row">{labels.weight}</th>{deck.comparison.map((lens) => <td key={lens.id}>{lens.weight}{lens.weight === "—" ? "" : " g"}</td>)}</tr>
        </tbody>
      </table>}
      <p>{labels.reference} · {labels.opticalImages}</p>
    </section>
    <footer className={styles.endFooter}>
      <div><p>{labels.visit}</p><strong>{SITE.host}</strong></div>
      <span>{number}</span>
    </footer>
  </>;
}
