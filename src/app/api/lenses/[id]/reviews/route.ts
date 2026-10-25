import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { routing } from "@/i18n/routing";
import { hasAccountSession } from "@/lib/auth-session";
import { getAllLenses } from "@/lib/lens/data";
import { loadLensReviews } from "@/lib/lens/reviews-repository";
import { previewReviews, toLensReviewsView, type LensReviewsView } from "@/lib/lens/reviews-view";
import { isRateLimited, rateLimitedResponse } from "@/lib/rate-limit";

const NO_REVIEWS: LensReviewsView = { sources: [], claims: [] };

/** Review findings for one catalogue lens, in the requested locale; empty when it has none. Public; a guest gets the overall verdict and the top two strengths and weaknesses; 400 for a bad locale, 404 for an unknown lens, 429 past the per-IP rate, 503 without the review store. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale");
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  if (!getAllLenses(locale).some((lens) => lens.id === id)) {
    return NextResponse.json({ error: "unknown_lens" }, { status: 404 });
  }
  if (await isRateLimited(request, "lensReviews")) {
    return rateLimitedResponse();
  }
  const db = getCloudflareContext().env.CATALOG_DB;
  if (!db) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const row = (await loadLensReviews(db, [id])).get(id);
  if (!row) {
    return NextResponse.json(NO_REVIEWS, { headers: { "Cache-Control": "public, max-age=600" } });
  }
  const view = toLensReviewsView(row, locale);
  return NextResponse.json((await hasAccountSession(request)) ? view : previewReviews(view), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
