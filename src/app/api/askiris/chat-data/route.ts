import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getLensLinkIndex } from "@/lib/ai/lens-link-index";
import type { AskIrisChatData } from "@/lib/askiris/chat-data";
import { BRANDS } from "@/lib/brands";
import { COLLECTIONS } from "@/lib/collections";
import { getLensSummaries } from "@/lib/lens/data";

/** Returns what an embedded Ask Iris chat needs to render links and the gear card. Public, read-only; 400 for an unknown locale. */
export function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale");
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400 });
  }
  const data: AskIrisChatData = {
    linkTargets: { lenses: getLensLinkIndex(locale), collections: Object.keys(COLLECTIONS), brands: BRANDS.map((b) => b.slug) },
    lenses: getLensSummaries(locale),
  };
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
}
