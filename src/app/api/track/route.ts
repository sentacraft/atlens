import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseEventProps, trackPayloadSchema } from "@/lib/analytics/events";
import {
  INTERNAL_COOKIE,
  INTERNAL_COOKIE_MAX_AGE,
  VID_COOKIE,
  VID_TTL_SECONDS,
  isInternalBrowser,
  isInternalEmail,
  isOptedOutOfStats,
  readVid,
} from "@/lib/analytics/session";
import { requestAttributes } from "@/lib/analytics/request-class";
import { insertEvent } from "@/lib/analytics/store";
import { getAccountEmail } from "@/lib/auth-session";
import { isBypassed, isRateLimited } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 4096;
const MAX_PATH_LENGTH = 256;

/** Records one product analytics event and sets the anonymous visitor cookie. Public; 400 on a malformed event, 413 on an oversized body, 429 past the per-IP rate. Records nothing when the visitor opted out. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (isOptedOutOfStats(req.cookies)) {
    return new NextResponse(null, { status: 204 });
  }
  if (await isRateLimited(req, "analytics")) {
    return new NextResponse(null, { status: 429 });
  }
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

  const { event, locale, path, props } = parsed.data;
  const existingVid = readVid(req.cookies);
  const vid = existingVid ?? crypto.randomUUID();

  let internalAccount = false;
  try {
    const { env, ctx, cf } = getCloudflareContext();
    const attributes = requestAttributes(req.headers, cf);
    if (attributes.uaClass === "in_app" && event === "page_view") {
      // Samples for naming more apps in request-class.ts; Workers Logs only, never the database.
      console.log("[track] unnamed in-app browser", req.headers.get("user-agent")?.slice(0, 300));
    }
    const email = await getAccountEmail(req).catch(() => undefined);
    const signedIn = email !== undefined;
    internalAccount = isInternalEmail(process.env.INTERNAL_EMAILS, email);
    const write = insertEvent(env.ANALYTICS_DB, {
      event,
      ts: Date.now(),
      vid,
      locale: locale?.slice(0, 8) ?? null,
      path: path?.slice(0, MAX_PATH_LENGTH) ?? null,
      signedIn,
      internal: internalAccount || isInternalBrowser(req.cookies) || isBypassed(req),
      props: parseEventProps(event, props),
      country: attributes.country,
      network: attributes.network,
      uaClass: attributes.uaClass,
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
  if (internalAccount) {
    // Marks this browser too, so its signed-out visits are excluded as well.
    res.cookies.set(INTERNAL_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: INTERNAL_COOKIE_MAX_AGE,
    });
  }
  return res;
}
