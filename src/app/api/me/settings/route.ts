import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/me/account-auth";
import { invalidRequest, readJson, unauthorized } from "@/lib/me/route-helpers";
import { getUserSettings, updateUserSettings } from "@/lib/me/settings-repository";
import { userSettingsPatchSchema } from "@/lib/me/settings-schema";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const settings = await getUserSettings(getCloudflareContext().env.APP_DB, userId);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const parsed = userSettingsPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return invalidRequest();
  }
  const settings = await updateUserSettings(getCloudflareContext().env.APP_DB, {
    userId,
    patch: parsed.data,
  });
  return NextResponse.json({ settings });
}
