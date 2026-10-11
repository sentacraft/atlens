import { NextResponse } from "next/server";
import { z } from "zod";
import type { UIMessage } from "ai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  importAskIrisConversation,
  ConversationOwnershipError,
} from "@/lib/askiris/conversation-repository";
import { getAskIrisUserId } from "@/lib/askiris/conversation-auth";

const uiMessageSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(z.unknown()),
  metadata: z.unknown().optional(),
});

const importSchema = z.object({
  conversationId: z.string().uuid(),
  locale: z.string().min(2).max(10),
  mount: z.string().min(1).max(32),
  messages: z.array(uiMessageSchema).min(1).max(200),
});

function getTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage?.parts
    .filter((part): part is { type: "text"; text: string } => {
      return (
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
      );
    })
    .map((part) => part.text)
    .join(" ")
    .trim();

  return text ? text.slice(0, 120) : "Ask Iris";
}

export async function POST(request: Request): Promise<NextResponse> {
  const userId = await getAskIrisUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const messages = parsed.data.messages as unknown as UIMessage[];
    await importAskIrisConversation(env.APP_DB, {
      ...parsed.data,
      messages,
      userId,
      title: getTitle(messages),
      context: { mount: parsed.data.mount, locale: parsed.data.locale },
      now: Date.now(),
    });
    return NextResponse.json({ conversationId: parsed.data.conversationId });
  } catch (error) {
    if (error instanceof ConversationOwnershipError) {
      return NextResponse.json({ error: "conversation_not_owned" }, { status: 403 });
    }
    return NextResponse.json({ error: "import_failed" }, { status: 500 });
  }
}

export function GET(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
