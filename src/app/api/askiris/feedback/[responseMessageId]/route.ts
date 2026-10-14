import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isRateLimited, rateLimitedResponse } from "@/lib/rate-limit";
import { askIrisResponseMessageIdSchema } from "@/lib/askiris/response-feedback-contract";
import { deleteAskIrisResponseFeedback } from "@/lib/askiris/response-feedback-repository";
import { getSessionUserId } from "@/lib/auth-session";
import { getOwnedAskIrisResponseTurnId } from "@/lib/askiris/conversation-repository";

/** Withdraws the caller's rating of one Iris response. Any session, guests included; 401 without one, 404 when the response is not the caller's, 429 when rate limited. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ responseMessageId: string }> },
): Promise<NextResponse> {
  if (await isRateLimited(req, "askirisFeedback")) {
    return rateLimitedResponse();
  }

  const { responseMessageId: rawResponseMessageId } = await params;
  const parsed = askIrisResponseMessageIdSchema.safeParse(rawResponseMessageId);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_feedback" }, { status: 400 });
  }

  const userId = await getSessionUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let env: CloudflareEnv;
  try {
    env = getCloudflareContext().env;
  } catch (error) {
    console.error("[askiris] response feedback database unavailable", error);
    return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });
  }

  try {
    const turnId = await getOwnedAskIrisResponseTurnId(env.APP_DB, {
      responseMessageId: parsed.data,
      userId,
    });
    if (!turnId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await deleteAskIrisResponseFeedback(env.ASKIRIS_DB, parsed.data);
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "unknown";
    console.error("[askiris] response feedback deletion failed", {
      errorType,
      responseMessageId: parsed.data,
    });
    return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
