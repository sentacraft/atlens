// Product-analytics event sink. Writes to the `xglass_events` Analytics
// Engine dataset bound as `ANALYTICS` in wrangler.toml. Anonymous session
// continuity is provided by a server-managed first-party cookie (`xg_sid`,
// HttpOnly, 30-min sliding window). Sid is the only field that crosses
// events for funnel/path analysis.
//
// No auth: events are fire-and-forget from any page view. Cloudflare's
// platform-level DDoS/Bot protection is sufficient. Body is size-capped
// and shape-validated to keep junk out of the dataset.

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  EVENT_NAME_SET,
  toDataPoint,
  type EventName,
  type EventProps,
  type TrackPayload,
} from "@/lib/analytics/events";
import { SID_COOKIE, SID_TTL_SECONDS, parseSid } from "@/lib/analytics/session";

const MAX_BODY_BYTES = 4096;
const MAX_STRING_LEN = 256;

const STRING_FIELDS = [
  "query",
  "filters_json",
  "lens_slug",
  "lens_slugs",
  "href",
  "path",
  "to_mount",
  "from_mount",
  "feedback_type",
  "method",
  "referrer",
  "channel",
  "lens_id",
  "source",
] as const;

function isValidPayload(p: unknown): p is TrackPayload {
  if (!p || typeof p !== "object") {
    return false;
  }
  const o = p as Record<string, unknown>;
  if (typeof o.event !== "string" || !EVENT_NAME_SET.has(o.event)) {
    return false;
  }
  if (o.locale !== undefined && typeof o.locale !== "string") {
    return false;
  }
  if (o.props !== undefined && (typeof o.props !== "object" || o.props === null)) {
    return false;
  }
  return true;
}

function parseInternal(cookieHeader: string | null): boolean {
  if (!cookieHeader) {
    return false;
  }
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === "xg_internal" && v === "1") {
      return true;
    }
  }
  return false;
}

function sanitizeProps(raw: unknown): EventProps {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: EventProps = {};
  for (const key of STRING_FIELDS) {
    const v = o[key];
    if (typeof v === "string") {
      out[key] = v.slice(0, MAX_STRING_LEN);
    }
  }
  for (const key of ["results_count", "lens_count", "depth_pct"] as const) {
    const v = o[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
    }
  }
  for (const key of ["is_affiliate"] as const) {
    const v = o[key];
    if (typeof v === "boolean") {
      out[key] = v;
    }
  }
  return out;
}

export async function POST(req: Request): Promise<NextResponse> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!isValidPayload(parsed)) {
    return new NextResponse(null, { status: 400 });
  }

  const event: EventName = parsed.event;
  const locale = (parsed.locale ?? "").slice(0, 8);
  const props = sanitizeProps(parsed.props);

  const cookieHeader = req.headers.get("cookie");
  const sid = parseSid(cookieHeader) ?? crypto.randomUUID();
  const internal = parseInternal(cookieHeader);

  try {
    const { env } = getCloudflareContext();
    const ae = env.ANALYTICS;
    if (ae) {
      ae.writeDataPoint(toDataPoint(event, sid, locale, props, internal));
    }
  } catch {
    // Binding may be unavailable (e.g. `next dev` without initOpenNext bound).
    // Swallow — analytics must never break a page.
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

export async function GET(): Promise<NextResponse> {
  return new NextResponse(null, { status: 405 });
}
