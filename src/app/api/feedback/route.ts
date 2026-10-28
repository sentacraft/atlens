import { NextResponse } from "next/server";
import { feedbackSubmissionSchema, type FeedbackSubmission } from "@/lib/feedback/feedback-contract";
import { isOverDailyCap, isRateLimited, rateLimitedResponse } from "@/lib/rate-limit";


const TITLE_SNIPPET_MAX = 60;

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

/** Reports whether site feedback is configured (GitHub token and repository). Public. */
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

/** Files site feedback as a GitHub issue. Public; 400 with the failing rule as the error code, 429 when rate limited or past the daily cap. */
export async function POST(req: Request) {
  if ((await isRateLimited(req, "feedback")) || (await isOverDailyCap(req, "feedback"))) {
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
      // GitHub returns 403 without a User-Agent, and Workers' fetch sends none.
      "User-Agent": "atlens-feedback",
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
