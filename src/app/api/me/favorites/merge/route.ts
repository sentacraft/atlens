import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/auth-session";
import { mergeUserFavorites } from "@/lib/me/favorites-repository";
import { mergeFavoritesInputSchema } from "@/lib/me/favorites-schema";
import { getLensById } from "@/lib/lens/data";

/** Merges a guest's local favorites into the caller's account, ignoring unknown lens ids and capping at 500. Accounts only; 401 for guests, 400 for invalid input. */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = mergeFavoritesInputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const validIds = parsed.data.lensIds.filter((lensId) => Boolean(getLensById(lensId)));
  const result = await mergeUserFavorites(getCloudflareContext().env.APP_DB, {
    userId,
    lensIds: validIds,
  });
  return NextResponse.json(result);
}
