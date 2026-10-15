import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { conversationRenameSchema } from "@/lib/askiris/conversation-contract";
import {
  deleteAskIrisConversation,
  getAskIrisConversationMessages,
  renameAskIrisConversation,
} from "@/lib/askiris/conversation-repository";
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

/** Renames one of the caller's conversations. Any session, guests included; 401 without one, 400 for an empty or overlong title, 404 when missing or not the caller's. */
export async function PATCH(
  request: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = conversationRenameSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { conversationId } = await params;
  const renamed = await renameAskIrisConversation(getCloudflareContext().env.APP_DB, {
    conversationId,
    userId,
    title: parsed.data.title,
  });
  if (!renamed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}

/** Deletes one of the caller's conversations and its messages. Any session, guests included; 401 without one, 404 when missing or not the caller's. */
export async function DELETE(
  request: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const userId = await getSessionUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const deleted = await deleteAskIrisConversation(getCloudflareContext().env.APP_DB, {
    conversationId,
    userId,
  });
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
