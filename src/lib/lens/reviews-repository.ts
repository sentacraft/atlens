import "server-only";
import type { LensReviewClaim, LensReviewSource } from "./reviews";

export interface LensReviews {
  sources: LensReviewSource[];
  claims: LensReviewClaim[];
}

/** Review claims for the given lenses, keyed by lens id; a lens without a row is absent. */
export async function loadLensReviews(db: D1Database, lensIds: string[]): Promise<Map<string, LensReviews>> {
  if (lensIds.length === 0) {
    return new Map();
  }
  const { results } = await db
    .prepare(`SELECT lens_id, sources, claims FROM lens_reviews WHERE lens_id IN (${lensIds.map(() => "?").join(", ")})`)
    .bind(...lensIds)
    .all<{ lens_id: string; sources: string; claims: string }>();
  return new Map(
    results.map((row) => [row.lens_id, { sources: JSON.parse(row.sources), claims: JSON.parse(row.claims) }]),
  );
}
