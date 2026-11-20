import Image from "next/image";
import AiTag from "@/components/iris/AiTag";
import { SITE } from "@/config/site";
import type { PromoDeck } from "@/lib/promo-collection";
import type { PromoLabels } from "./PromoPoster";
import styles from "./promo-poster.module.css";

export function PromoOpticalEnd({ catalog, labels }: {
  catalog: PromoDeck["catalog"]; labels: PromoLabels;
}) {
  return <>
    <section className={styles.opticalBody}>
      <div className={styles.opticalLayout}>
        <svg className={styles.opticalLines} aria-hidden="true" viewBox="0 0 936 840" width="936" height="840" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M255 383a218 218 0 0 1 386-130M700 443a235 235 0 0 1-370 154M236 481a244 244 0 0 0 49 74M661 264a244 244 0 0 1 41 68" strokeDasharray="2 8" />
          <path d="M224 252h42l57 35M744 218h-65l-37 54M56 510h129l57-94M746 535h-51l-52-39M88 633h137l59-69M676 696h-65l-48-76M413 112v66l26 30" />
        </svg>
        <h2 className={styles.opticalHost}>{SITE.host}</h2>
        <div className={`${styles.opticalPoint} ${styles.opticalWeight}`}>{labels.opticalWeight}</div>
        <div className={`${styles.opticalPoint} ${styles.opticalCatalog}`}>
          {labels.opticalCatalog}<small>{catalog.brands} {labels.brandUnit} · {catalog.lenses} {labels.lensUnit}</small>
        </div>
        <div className={`${styles.opticalPoint} ${styles.opticalCompare}`}>{labels.opticalCompare}</div>
        <div className={`${styles.opticalPoint} ${styles.opticalThemes}`}>
          {labels.themesTitle}<small>{labels.themesCount.replace("{count}", String(catalog.themes))}</small>
        </div>
        <div className={`${styles.opticalPoint} ${styles.opticalReviews}`}>{labels.opticalReviews}</div>
        <div className={`${styles.opticalPoint} ${styles.opticalMtf}`}>{labels.opticalMtf}</div>
        <div className={`${styles.opticalPoint} ${styles.opticalIris}`}>
          <Image src="/icons/icon-192.png" alt="" width={27} height={27} unoptimized loading="eager" />
          <span>Iris</span><AiTag className={styles.opticalAiTag} /><span>{labels.irisHelpEditorial}</span>
        </div>
      </div>
    </section>
    <hr className={styles.opticalFooter} aria-hidden="true" />
  </>;
}
