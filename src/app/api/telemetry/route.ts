// Telemetry sink for AssetTelemetry.tsx beacons. Stays minimal on purpose:
// the goal is to surface client-side asset failures and degraded Web Vitals
// in Cloudflare Workers Observability logs, attributed by CF-IPCountry and
// CF-Ray (PoP). Query in the CF Dashboard with messages prefixed `[tlm]`.
//
// No auth: beacons are fire-and-forget from any page view. Cloudflare's
// platform-level DDoS/Bot protection is sufficient for this volume. We cap
// the body size and validate the shape so a malicious POST can't fill logs.

import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 2048;

type AssetErrorPayload = {
  evt: "asset-error";
  tag: string;
  url: string;
  conn?: string;
  ts: number;
  page: string;
};

type SlowAssetPayload = {
  evt: "slow-asset";
  kind: string;
  url: string;
  duration: number;
  ttfb: number;
  transfer?: number;
  encoded?: number;
  ts: number;
  page: string;
};

type Payload = AssetErrorPayload | SlowAssetPayload;

function isAssetError(p: unknown): p is AssetErrorPayload {
  if (!p || typeof p !== "object") {
    return false;
  }
  const o = p as Record<string, unknown>;
  return o.evt === "asset-error" && typeof o.tag === "string" && typeof o.url === "string";
}

function isSlowAsset(p: unknown): p is SlowAssetPayload {
  if (!p || typeof p !== "object") {
    return false;
  }
  const o = p as Record<string, unknown>;
  return (
    o.evt === "slow-asset" &&
    typeof o.kind === "string" &&
    typeof o.url === "string" &&
    typeof o.duration === "number"
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  let payload: Payload;
  if (isAssetError(parsed)) {
    payload = parsed;
  } else if (isSlowAsset(parsed)) {
    payload = parsed;
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const headers = req.headers;
  const country = headers.get("cf-ipcountry") ?? "??";
  const ray = headers.get("cf-ray") ?? "-";
  const pop = ray.includes("-") ? ray.slice(ray.lastIndexOf("-") + 1) : "-";
  const ua = headers.get("user-agent") ?? "-";

  // Single-line JSON log so CF Observability indexes the fields. Prefix
  // `[tlm]` makes it trivial to grep / filter in the dashboard.
  console.log(
    "[tlm]",
    JSON.stringify({ ...payload, country, ray, pop, ua: ua.slice(0, 200) }),
  );

  return new NextResponse(null, { status: 204 });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: false }, { status: 405 });
}
