import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { feedbackSubmissionSchema, type FeedbackSubmission } from "@/lib/feedback/feedback-contract";
import {
  claimFeedbackSubmission,
  getFeedbackSubmission,
  hashFeedbackPayload,
  releaseFeedbackSubmission,
  updateFeedbackSubmissionStatus,
  type FeedbackSubmissionRecord,
} from "@/lib/feedback/feedback-repository";
import { isOverDailyCap, isRateLimited, rateLimitedResponse } from "@/lib/rate-limit";

const TITLE_SNIPPET_MAX = 60;
const GITHUB_TIMEOUT_MS = 15_000;

function neutralizeMentions(value: string): string {
  return value.replace(/(^|[^a-z0-9_])@/gi, "$1@\u200b");
}

function titleSnippet(description: string): string {
  const oneLine = description.replace(/\s+/g, " ").trim();
  const chars = Array.from(oneLine);
  if (chars.length <= TITLE_SNIPPET_MAX) {
    return oneLine;
  }
  const cut = chars.slice(0, TITLE_SNIPPET_MAX).join("");
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = lastSpace > TITLE_SNIPPET_MAX * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.trimEnd()}…`;
}

function buildIssue(payload: FeedbackSubmission): {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
} {
  const { type, description, replyContact, context } = payload;
  const lines: string[] = [type === "data_issue" ? "**Type:** Data issue" : "**Type:** General feedback"];

  if (context?.lensModel) {
    const lensLabel = context.lensBrand
      ? `${context.lensBrand} ${context.lensModel}`
      : context.lensModel;
    lines.push(`**Lens:** ${lensLabel}`);
  }
  if (context?.lensId) {
    lines.push(`**Lens ID:** \`${context.lensId}\``);
  }

  if (type === "data_issue") {
    if (context?.field) {
      lines.push(`**Affected field:** ${context.field}`);
    }
    if (context?.currentValue) {
      lines.push(`**Current value:** ${context.currentValue}`);
    }
    if (context?.suggestedCorrection) {
      lines.push(`**Suggested correction:** ${context.suggestedCorrection}`);
    }
  } else {
    if (context?.searchQuery) {
      lines.push(`**Search query:** \`${context.searchQuery}\``);
    }
  }

  if (replyContact) {
    lines.push(`**Reply-to:** ${replyContact}`);
  }

  if (description.trim()) {
    lines.push("", "---", "", description);
  }

  let title: string;
  if (type === "data_issue") {
    const base = context?.lensModel ?? "Data issue report";
    title = context?.field
      ? `[Data] ${base} — ${context.field}`
      : `[Data] ${base}`;
  } else if (context?.searchQuery) {
    title = `[Feedback] Missing lens: ${context.searchQuery}`;
  } else {
    const snippet = titleSnippet(description);
    title = snippet ? `[Feedback] ${snippet}` : `[Feedback] General feedback`;
  }

  const labels = ["user-feedback", `feedback:${type}`];
  const assignees = (process.env.GITHUB_FEEDBACK_ASSIGNEES ?? "")
    .split(",")
    .map((assignee) => assignee.trim())
    .filter(Boolean);

  return {
    title: neutralizeMentions(title),
    body: neutralizeMentions(lines.join("\n")),
    labels,
    ...(assignees.length > 0 ? { assignees } : {}),
  };
}

function replaySubmission(record: FeedbackSubmissionRecord, payloadHash: string) {
  if (record.payloadHash !== payloadHash) {
    return NextResponse.json({ error: "submission_conflict" }, { status: 409 });
  }
  return NextResponse.json({ status: record.status });
}

/** Reports readiness or a submission's status to anyone; 400 invalid ID, 429 rate limited, 503 storage unavailable. */
export async function GET(req?: Request) {
  const submissionId = req ? new URL(req.url).searchParams.get("submissionId") : null;
  if (submissionId !== null) {
    if (await isRateLimited(req!, "feedback")) {
      return rateLimitedResponse();
    }
    if (!feedbackSubmissionSchema.shape.submissionId.safeParse(submissionId).success) {
      return NextResponse.json({ error: "invalid_submission_id" }, { status: 400 });
    }
    try {
      const record = await getFeedbackSubmission(getCloudflareContext().env.APP_DB, submissionId);
      return NextResponse.json({ status: record?.status ?? null }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
    }
  }
  const hasToken = Boolean(process.env.GITHUB_TOKEN);
  const hasRepo = Boolean(process.env.GITHUB_FEEDBACK_REPO);
  const missingEnv = [
    ...(hasToken ? [] : ["GITHUB_TOKEN"]),
    ...(hasRepo ? [] : ["GITHUB_FEEDBACK_REPO"]),
  ];
  return NextResponse.json({
    ok: true,
    ready: missingEnv.length === 0,
    missingEnv,
  });
}

/** Files feedback once per submission ID for anyone; 400 invalid input, 409 payload conflict, 429 capped, 500 misconfigured, 502 GitHub failure, 503 storage/quota unavailable. */
export async function POST(req: Request) {
  if (await isRateLimited(req, "feedback")) {
    return rateLimitedResponse();
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = feedbackSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const payload = parsed.data;

  let db: D1Database;
  let payloadHash: string;
  let claim: Awaited<ReturnType<typeof claimFeedbackSubmission>>;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_FEEDBACK_REPO;
  try {
    db = getCloudflareContext().env.APP_DB;
    payloadHash = await hashFeedbackPayload(payload);
    const existing = await getFeedbackSubmission(db, payload.submissionId);
    if (existing && existing.status !== "failed") {
      return replaySubmission(existing, payloadHash);
    }
    if (!token || !repo) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }
    claim = await claimFeedbackSubmission(db, payload.submissionId, payloadHash);
    if (!claim.claimed) {
      return replaySubmission(claim.record, payloadHash);
    }
  } catch {
    return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });
  }

  if (claim.created) {
    try {
      if (await isOverDailyCap(req, "feedback")) {
        await releaseFeedbackSubmission(db, payload.submissionId, payloadHash);
        return rateLimitedResponse();
      }
    } catch {
      await releaseFeedbackSubmission(db, payload.submissionId, payloadHash).catch(() => {});
      return NextResponse.json({ error: "quota_unavailable" }, { status: 503 });
    }
  }

  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        // GitHub returns 403 without a User-Agent, and Workers' fetch sends none.
        "User-Agent": "atlens-feedback",
      },
      body: JSON.stringify(buildIssue(payload)),
    });

    if (!ghRes.ok) {
      const status = ghRes.status >= 400 && ghRes.status < 500 ? "failed" : "uncertain";
      await updateFeedbackSubmissionStatus(db, payload.submissionId, payloadHash, status);
      return NextResponse.json({ status, error: "github_api_error" }, { status: 502 });
    }

    const result: unknown = await ghRes.json();
    if (typeof result !== "object" || result === null || !("number" in result) ||
      typeof result.number !== "number" || !Number.isSafeInteger(result.number) || result.number <= 0) {
      throw new Error("Invalid GitHub issue response");
    }
    await updateFeedbackSubmissionStatus(db, payload.submissionId, payloadHash, "sent", result.number);
    return NextResponse.json({ status: "sent" });
  } catch {
    // A lost response or completion write can hide a created issue. Never release this claim.
    await updateFeedbackSubmissionStatus(db, payload.submissionId, payloadHash, "uncertain").catch(() => {});
    return NextResponse.json({ status: "uncertain", error: "submission_uncertain" }, { status: 502 });
  }
}
