import { NextResponse } from "next/server";
import { telemetryPayloadSchema } from "@/lib/analytics/telemetry-contract";
import { isRateLimited } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 2048;

/** Logs a browser asset failure or slow asset load to Workers Logs. Public; 429 past the per-IP rate. */
export async function POST(req: Request): Promise<NextResponse> {
  if (await isRateLimited(req, "analytics")) {
    return new NextResponse(null, { status: 429 });
  }
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
  const result = telemetryPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const payload = result.data;

  const headers = req.headers;
  const country = headers.get("cf-ipcountry") ?? "??";
  const ray = headers.get("cf-ray") ?? "-";
  const pop = ray.includes("-") ? ray.slice(ray.lastIndexOf("-") + 1) : "-";
  const ua = headers.get("user-agent") ?? "-";

  console.log(
    "[tlm]",
    JSON.stringify({ ...payload, country, ray, pop, ua: ua.slice(0, 200) }),
  );

  return new NextResponse(null, { status: 204 });
}
