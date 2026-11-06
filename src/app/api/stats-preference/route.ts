import { NextResponse } from "next/server";
import { STATS_OPT_OUT_COOKIE } from "@/lib/analytics/session";
import { statsPreferenceSchema } from "@/lib/analytics/stats-preference";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Turns usage statistics on or off for this browser by setting or clearing a cookie. Public; 400 on a malformed body. */
export async function POST(req: Request): Promise<NextResponse> {
  const parsed = statsPreferenceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new NextResponse(null, { status: 400 });
  }
  const res = new NextResponse(null, { status: 204 });
  // Not httpOnly: the About switch reads it to show the current state.
  res.cookies.set(STATS_OPT_OUT_COOKIE, parsed.data.enabled ? "" : "1", {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: parsed.data.enabled ? 0 : ONE_YEAR,
  });
  return res;
}
