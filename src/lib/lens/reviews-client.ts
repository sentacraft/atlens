import { queryOptions } from "@tanstack/react-query";
import { lensReviewsViewSchema, type LensReviewsView } from "@/lib/lens/reviews-view";

/** A lens's review findings in the page's language; empty when it has none. */
export function lensReviewsQuery(lensId: string, locale: string) {
  return queryOptions({
    queryKey: ["lens-reviews", lensId, locale],
    queryFn: async (): Promise<LensReviewsView> => {
      const response = await fetch(`/api/lenses/${encodeURIComponent(lensId)}/reviews?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) {
        throw new Error(`lens_reviews_${response.status}`);
      }
      return lensReviewsViewSchema.parse(await response.json());
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
