import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/auth-session";
import { getUserSettings, updateUserSettings } from "@/lib/me/settings-repository";
import { userSettingsPatchSchema } from "@/lib/me/settings-schema";

/** Returns the caller's settings, or the defaults when none are saved. Accounts only; 401 for guests. */
export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const settings = await getUserSettings(getCloudflareContext().env.APP_DB, userId);
  return NextResponse.json({ settings });
}

/** Updates the given settings and returns them all. Accounts only; 400 for an empty patch or a value outside the allowed set. */
export async function PATCH(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = userSettingsPatchSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const settings = await updateUserSettings(getCloudflareContext().env.APP_DB, {
    userId,
    patch: parsed.data,
  });
  return NextResponse.json({ settings });
}
