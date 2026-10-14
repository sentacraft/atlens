import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/auth-session";
import { resolveGearInput } from "@/lib/me/gear";
import { addUserGear, GearLimitError, listUserGear } from "@/lib/me/gear-repository";
import { gearInputSchema } from "@/lib/me/gear-schema";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const gear = await listUserGear(getCloudflareContext().env.APP_DB, userId);
  return NextResponse.json({ gear });
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = gearInputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const item = resolveGearInput(parsed.data);
  if (!item) {
    return NextResponse.json({ error: "unknown_catalog_id" }, { status: 400 });
  }
  try {
    const gear = await addUserGear(getCloudflareContext().env.APP_DB, { userId, item });
    return NextResponse.json({ gear }, { status: 201 });
  } catch (error) {
    if (error instanceof GearLimitError) {
      return NextResponse.json({ error: "gear_limit_reached" }, { status: 409 });
    }
    throw error;
  }
}
