import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/auth-session";
import { removeUserFavorite } from "@/lib/me/favorites-repository";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ lensId: string }> },
): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { lensId } = await params;
  await removeUserFavorite(getCloudflareContext().env.APP_DB, { userId, lensId });
  return new NextResponse(null, { status: 204 });
}
