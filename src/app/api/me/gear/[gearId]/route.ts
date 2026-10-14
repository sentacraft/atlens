import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/auth-session";
import { deleteUserGear } from "@/lib/me/gear-repository";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ gearId: string }> },
): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { gearId } = await params;
  const deleted = await deleteUserGear(getCloudflareContext().env.APP_DB, { userId, gearId });
  // Missing and foreign ids return the same 404, so ids cannot be probed.
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
