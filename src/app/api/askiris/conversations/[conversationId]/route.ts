import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAskIrisConversationMessages } from "@/lib/askiris/conversation-repository";
import { getSessionUserId } from "@/lib/auth-session";

type Params = Promise<{ conversationId: string }>;

/** Returns one conversation's stored messages. Any session, guests included; 401 without one, 404 when missing or not the caller's. */
export async function GET(
  request: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const { env } = getCloudflareContext();
  const messages = await getAskIrisConversationMessages(env.APP_DB, {
    conversationId,
    userId,
  });

  // Missing and foreign ids return the same 404, so ids cannot be probed.
  if (messages.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ conversationId, messages });
}
