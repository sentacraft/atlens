import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  listAskIrisConversations,
} from "@/lib/askiris/conversation-repository";
import { getSessionUserId } from "@/lib/auth-session";

export async function GET(request: Request): Promise<NextResponse> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { env } = getCloudflareContext();
  const conversations = await listAskIrisConversations(env.APP_DB, userId);
  return NextResponse.json({ conversations });
}

export function POST(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "GET" } });
}
