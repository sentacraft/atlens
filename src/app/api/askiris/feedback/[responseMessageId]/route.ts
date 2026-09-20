import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRateLimiter, rateLimitedResponse } from "@/lib/rate-limit";
import { askIrisResponseMessageIdSchema } from "@/lib/askiris/response-feedback-contract";
import { deleteAskIrisResponseFeedback } from "@/lib/askiris/response-feedback-repository";

const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ responseMessageId: string }> },
): Promise<NextResponse> {
  if (!checkRateLimit(req)) {
    return rateLimitedResponse();
  }

  const { responseMessageId: rawResponseMessageId } = await params;
  const parsed = askIrisResponseMessageIdSchema.safeParse(rawResponseMessageId);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_feedback" }, { status: 400 });
  }

  let db: D1Database;
  try {
    db = getCloudflareContext().env.ASKIRIS_DB;
  } catch (error) {
    console.error("[askiris] response feedback database unavailable", error);
    return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });
  }

  try {
    await deleteAskIrisResponseFeedback(db, parsed.data);
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
