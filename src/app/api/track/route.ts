import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseEventProps, trackPayloadSchema } from "@/lib/analytics/events";
import { VID_COOKIE, VID_TTL_SECONDS, isInternalBrowser, readVid } from "@/lib/analytics/session";
import { insertEvent } from "@/lib/analytics/store";
import { isBypassed } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 4096;
const MAX_PATH_LENGTH = 256;

/** Records one product analytics event and sets the anonymous visitor cookie. Public; 400 on a malformed event, 413 on an oversized body. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = trackPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 });
  }

  const { event, locale, path, signed_in: signedIn, props } = parsed.data;
  const existingVid = readVid(req.cookies);
  const vid = existingVid ?? crypto.randomUUID();

  try {
    const { env, ctx } = getCloudflareContext();
    const write = insertEvent(env.ANALYTICS_DB, {
      event,
      ts: Date.now(),
      vid,
      locale: locale?.slice(0, 8) ?? null,
      path: path?.slice(0, MAX_PATH_LENGTH) ?? null,
      signedIn: signedIn ?? false,
      internal: isInternalBrowser(req.cookies) || isBypassed(req),
      props: parseEventProps(event, props),
    }).catch((error: unknown) => console.error("[track] failed to write event", error));
    ctx.waitUntil(write);
  } catch {
  }

  const res = new NextResponse(null, { status: 204 });
  // Set once and never refreshed, so a browser is recognised for at most 30 days.
  if (!existingVid) {
    res.cookies.set(VID_COOKIE, vid, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VID_TTL_SECONDS,
    });
  }
  return res;
}
