import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { getAccountUserId } from "@/lib/me/account-auth";
import {
  addUserFavorite,
  FavoritesLimitError,
  listUserFavorites,
} from "@/lib/me/favorites-repository";
import { findCatalogLens } from "@/lib/me/gear";
import { invalidRequest, readJson, unauthorized } from "@/lib/me/route-helpers";

const favoriteInputSchema = z.strictObject({ lensId: z.string().trim().min(1).max(200) });

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const favorites = await listUserFavorites(getCloudflareContext().env.APP_DB, userId);
  return NextResponse.json({ favorites });
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const parsed = favoriteInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return invalidRequest();
  }
  if (!findCatalogLens(parsed.data.lensId)) {
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
