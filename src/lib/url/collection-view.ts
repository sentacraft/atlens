import { firstSearchParam } from "@/lib/url/search-params";

export const COLLECTION_VIEW_PARAM = "view";

/** How a collection page lists its lenses: cards, or the weight ranking where the collection has one. */
export type CollectionView = "cards" | "weight";

export function readCollectionView(value: string | string[] | undefined | null): CollectionView {
  return firstSearchParam(value ?? undefined) === "weight" ? "weight" : "cards";
}

/** Sets the view param on `url` in place; cards, the default, leaves it out. */
export function writeCollectionView(url: URL, view: CollectionView): void {
  url.searchParams.delete(COLLECTION_VIEW_PARAM);
  if (view !== "cards") {
    url.searchParams.set(COLLECTION_VIEW_PARAM, view);
  }
}
