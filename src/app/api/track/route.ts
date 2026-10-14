import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { toDataPoint, trackPayloadSchema } from "@/lib/analytics/events";
import { SID_COOKIE, SID_TTL_SECONDS, parseSid, parseInternal } from "@/lib/analytics/session";
import { isBypassed } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 4096;

/** Writes one product analytics event to Analytics Engine and sets the analytics session cookie. Public. */
export async function POST(req: Request): Promise<NextResponse> {
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

  const { event } = parsed.data;
  const locale = (parsed.data.locale ?? "").slice(0, 8);
  const props = parsed.data.props ?? {};

  const cookieHeader = req.headers.get("cookie");
  const sid = parseSid(cookieHeader) ?? crypto.randomUUID();
  const internal =
    parseInternal(cookieHeader) || isBypassed(req);

  try {
    const { env } = getCloudflareContext();
    const ae = env.ANALYTICS;
    if (ae) {
      ae.writeDataPoint(toDataPoint(event, sid, locale, props, internal));
    }
  } catch {
  }

  const isSecure =
    req.url.startsWith("https://") || process.env.NODE_ENV === "production";
  const cookie = [
    `${SID_COOKIE}=${sid}`,
    "Path=/",
    `Max-Age=${SID_TTL_SECONDS}`,
    "SameSite=Lax",
    "HttpOnly",
    isSecure ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");

  const res = new NextResponse(null, { status: 204 });
  res.headers.append("Set-Cookie", cookie);
  return res;
}
