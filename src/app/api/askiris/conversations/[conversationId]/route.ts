import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAskIrisConversationMessages } from "@/lib/askiris/conversation-repository";
import { getAskIrisUserId } from "@/lib/askiris/conversation-auth";

type Params = Promise<{ conversationId: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const userId = await getAskIrisUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const { env } = getCloudflareContext();
  const messages = await getAskIrisConversationMessages(env.APP_DB, {
    conversationId,
    userId,
  });

  return NextResponse.json({ conversationId, messages });
}

export function POST(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "GET" } });
}
