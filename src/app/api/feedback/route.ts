import { NextResponse } from "next/server";

type FeedbackType = "data_issue" | "missing_lens" | "general";

interface FeedbackPayload {
  type: FeedbackType;
  description: string;
  context?: {
    lensId?: string;
    lensModel?: string;
    searchQuery?: string;
    field?: string;
    currentValue?: string;
    suggestedCorrection?: string;
  };
}

const MAX_DESCRIPTION_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

function buildIssue(payload: FeedbackPayload): {
  title: string;
  body: string;
  labels: string[];
} {
  const { type, description, context } = payload;
  const lines: string[] = [];

  if (type === "data_issue") {
    lines.push(`**Type:** Data issue`);
    if (context?.lensModel) {
      lines.push(`**Lens:** ${context.lensModel}`);
    }
    if (context?.lensId) {
      lines.push(`**Lens ID:** \`${context.lensId}\``);
    }
    if (context?.field) {
      lines.push(`**Affected field:** ${context.field}`);
    }
    if (context?.currentValue) {
      lines.push(`**Current value:** ${context.currentValue}`);
    }
    if (context?.suggestedCorrection) {
      lines.push(`**Suggested correction:** ${context.suggestedCorrection}`);
    }
  } else if (type === "missing_lens") {
    lines.push(`**Type:** Missing lens`);
    if (context?.searchQuery) {
      lines.push(`**Search query:** \`${context.searchQuery}\``);
    }
  } else {
    lines.push(`**Type:** General feedback`);
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
  } else if (type === "missing_lens") {
    title = context?.searchQuery
      ? `[Missing] ${context.searchQuery}`
      : `[Missing] Missing lens suggestion`;
  } else {
    title = `[Feedback] General feedback`;
  }

  const labels = ["user-feedback", `feedback:${type}`];

  return { title, body: lines.join("\n"), labels };
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429 }
    );
  }

  let payload: FeedbackPayload;
  try {
    payload = (await req.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validTypes: FeedbackType[] = ["data_issue", "missing_lens", "general"];
  if (!payload?.type || !validTypes.includes(payload.type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const descriptionPresent =
    typeof payload.description === "string" &&
    payload.description.trim().length > 0;
  const correctionPresent =
    typeof payload.context?.suggestedCorrection === "string" &&
    payload.context.suggestedCorrection.trim().length > 0;
  if (!descriptionPresent && !correctionPresent) {
    return NextResponse.json({ error: "empty_description" }, { status: 400 });
  }
  if (
    typeof payload.description === "string" &&
    payload.description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return NextResponse.json(
      { error: "description_too_long" },
      { status: 400 }
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_FEEDBACK_REPO;
  if (!token || !repo) {
    console.error("[feedback] missing GITHUB_TOKEN or GITHUB_FEEDBACK_REPO");
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 }
    );
  }

  const issue = buildIssue(payload);

  const ghRes = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(issue),
  });

  if (!ghRes.ok) {
    const errText = await ghRes.text().catch(() => "");
    console.error("[feedback] GitHub API error", ghRes.status, errText);
    return NextResponse.json(
      { error: "github_api_error" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
