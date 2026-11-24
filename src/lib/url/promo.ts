import { ADMIN_PROMO_PATH } from "@/lib/url/routes";

const COLLECTION_PARAM = "collection";

export function promoCollectionParam(params: Record<string, string | string[] | undefined>) {
  const slug = params[COLLECTION_PARAM];
  return typeof slug === "string" ? slug : undefined;
}

export function promoCollectionPath(slug: string) {
  return `${ADMIN_PROMO_PATH}?${new URLSearchParams({ [COLLECTION_PARAM]: slug })}`;
}
