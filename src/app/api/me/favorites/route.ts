import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { getAccountUserId } from "@/lib/auth-session";
import {
  addUserFavorite,
  FavoritesLimitError,
  listUserFavorites,
} from "@/lib/me/favorites-repository";
import { getLensById } from "@/lib/lens/data";

const favoriteInputSchema = z.strictObject({ lensId: z.string().trim().min(1).max(200) });

/** Lists the caller's favorite lenses, newest first. Accounts only; 401 for guests. */
export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const favorites = await listUserFavorites(getCloudflareContext().env.APP_DB, userId);
  return NextResponse.json({ favorites });
}

/** Adds a catalog lens to the caller's favorites; repeating it is a no-op. Accounts only; 400 for an unknown lens, 409 past 500 favorites. */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = favoriteInputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!getLensById(parsed.data.lensId)) {
    return NextResponse.json({ error: "unknown_catalog_id" }, { status: 400 });
  }
  try {
    await addUserFavorite(getCloudflareContext().env.APP_DB, { userId, lensId: parsed.data.lensId });
  } catch (error) {
    if (error instanceof FavoritesLimitError) {
      return NextResponse.json({ error: "favorites_limit_reached" }, { status: 409 });
    }
    throw error;
  }
  return new NextResponse(null, { status: 204 });
}
