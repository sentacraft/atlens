import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createRateLimiter, rateLimitedResponse } from "@/lib/rate-limit";
import { askIrisResponseFeedbackInputSchema } from "@/lib/askiris/response-feedback-contract";
import { saveAskIrisResponseFeedback } from "@/lib/askiris/response-feedback-repository";

const MAX_BODY_BYTES = 8 * 1024;

const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

function invalidFeedbackResponse(): NextResponse {
  return NextResponse.json({ error: "invalid_feedback" }, { status: 400 });
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkRateLimit(req)) {
    return rateLimitedResponse();
  }

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return invalidFeedbackResponse();
  }

  const parsed = askIrisResponseFeedbackInputSchema.safeParse(payload);
  if (!parsed.success) {
    return invalidFeedbackResponse();
  }

  const reasonCodes = parsed.data.reasonCodes?.length
    ? [...new Set(parsed.data.reasonCodes)]
    : undefined;
  const comment = parsed.data.comment || undefined;

  let db: D1Database;
  try {
    db = getCloudflareContext().env.ASKIRIS_DB;
  } catch (error) {
    console.error("[askiris] response feedback database unavailable", error);
    return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });
  }

  try {
    await saveAskIrisResponseFeedback(db, {
      feedbackId: crypto.randomUUID(),
      turnId: parsed.data.turnId,
      responseMessageId: parsed.data.responseMessageId,
      rating: parsed.data.rating,
      reasonCodes,
      comment,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } catch (error) {
    // Do not log the user's free-form comment or reason details.
    const errorType = error instanceof Error ? error.name : "unknown";
    console.error("[askiris] response feedback persistence failed", {
      errorType,
      responseMessageId: parsed.data.responseMessageId,
    });
    return NextResponse.json({ error: "feedback_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

export function GET(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
