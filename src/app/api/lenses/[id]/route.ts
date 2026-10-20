import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getAllLenses } from "@/lib/lens/data";
import type { LensResponse } from "@/lib/lens/lens-client";

type Params = Promise<{ id: string }>;

/** Returns one lens's catalog record in the requested locale, for the lens preview. Public; 404 for an unknown lens. */
export async function GET(request: Request, { params }: { params: Params }): Promise<NextResponse> {
  const { id } = await params;
  const requested = new URL(request.url).searchParams.get("locale");
  const locale = routing.locales.find((candidate) => candidate === requested) ?? routing.defaultLocale;
  const lens = getAllLenses(locale).find((candidate) => candidate.id === id);
  if (!lens) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body: LensResponse = { lens };
  // The catalog only changes with a deploy.
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
