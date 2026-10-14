import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/me/account-auth";
import { removeUserFavorite } from "@/lib/me/favorites-repository";
import { unauthorized } from "@/lib/me/route-helpers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ lensId: string }> },
): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const { lensId } = await params;
  await removeUserFavorite(getCloudflareContext().env.APP_DB, { userId, lensId });
  return new NextResponse(null, { status: 204 });
}
