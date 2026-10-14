import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/me/account-auth";
import { deleteUserGear } from "@/lib/me/gear-repository";
import { unauthorized } from "@/lib/me/route-helpers";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ gearId: string }> },
): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const { gearId } = await params;
  const deleted = await deleteUserGear(getCloudflareContext().env.APP_DB, { userId, gearId });
  // Missing and foreign ids return the same 404, so ids cannot be probed.
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
