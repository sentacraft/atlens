import { notFound } from "next/navigation";
import { PromoStudio } from "@/components/admin/promo/PromoStudio";
import { getPromoCollection, promoLabels } from "@/lib/promo-collection.server";
import { promoCollectionParam } from "@/lib/url/promo";

export const metadata = { title: "Promo Studio" };

export default async function AdminPromoPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const source = getPromoCollection(promoCollectionParam(await searchParams));
  if (!source) {notFound();}
  return <PromoStudio key={source.deck.slug} {...source} labels={promoLabels} />;
}
