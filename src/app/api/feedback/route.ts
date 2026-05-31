import { NextResponse } from "next/server";
import { createRateLimiter, RATE_LIMITED_RESPONSE } from "@/lib/rate-limit";

type FeedbackType = "data_issue" | "general";

interface FeedbackPayload {
  type: FeedbackType;
  description: string;
  replyContact?: string;
  context?: {
    lensId?: string;
    lensBrand?: string;
    lensModel?: string;
    searchQuery?: string;
    field?: string;
    currentValue?: string;
    suggestedCorrection?: string;
  };
}

const MAX_DESCRIPTION_LENGTH = 2000;

// Max length (in code points) of the description snippet used as an issue title.
const TITLE_SNIPPET_MAX = 60;

const checkRateLimit = createRateLimiter({ windowMs: 60_000, max: 5 });

// Collapse a (possibly multi-line) description into a single-line title snippet,
// truncating at a word boundary with an ellipsis when it exceeds the limit.
// Returns "" for a blank description so the caller can fall back to a label.
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

function buildIssue(payload: FeedbackPayload): {
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
} {
  const { type, description, replyContact, context } = payload;
  const lines: string[] = [];

  if (type === "data_issue") {
    lines.push(`**Type:** Data issue`);
    if (context?.lensModel) {
      const lensLabel = context.lensBrand
        ? `${context.lensBrand} ${context.lensModel}`
        : context.lensModel;
      lines.push(`**Lens:** ${lensLabel}`);
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
  } else {
    lines.push(`**Type:** General feedback`);
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
    // Use a one-line snippet of the description so general-feedback issues are
    // distinguishable in the list instead of all sharing one title.
    const snippet = titleSnippet(description);
    title = snippet ? `[Feedback] ${snippet}` : `[Feedback] General feedback`;
  }

  const labels = ["user-feedback", `feedback:${type}`];
  const assignees = (process.env.GITHUB_FEEDBACK_ASSIGNEES ?? "")
    .split(",")
    .map((assignee) => assignee.trim())
    .filter(Boolean);

  return {
    title,
    body: lines.join("\n"),
    labels,
    ...(assignees.length > 0 ? { assignees } : {}),
  };
}

// Health probe. Reports whether required env vars are wired up in the
// current runtime, without leaking values — names are already in source.
export function GET() {
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

export async function POST(req: Request) {
  if (!checkRateLimit(req)) {
    return RATE_LIMITED_RESPONSE;
  }

  let payload: FeedbackPayload;
  try {
    payload = (await req.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validTypes: FeedbackType[] = ["data_issue", "general"];
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
      // Required by the GitHub REST API. Workers' fetch sends no default
      // UA, so omitting it returns 403 before reaching the endpoint.
      "User-Agent": "x-glass-feedback",
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
