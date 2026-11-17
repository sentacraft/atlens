import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { createSqliteD1 } from "@/lib/__tests__/support/sqlite-d1";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  isRateLimited: vi.fn(),
  isOverDailyCap: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.getCloudflareContext }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/rate-limit")>(),
  isRateLimited: mocks.isRateLimited,
  isOverDailyCap: mocks.isOverDailyCap,
}));

let database: ReturnType<typeof createSqliteD1>;
beforeEach(() => {
  database = createSqliteD1("migrations/app");
  mocks.getCloudflareContext.mockReturnValue({ env: { APP_DB: database.d1 } });
  mocks.isRateLimited.mockReset().mockResolvedValue(false);
  mocks.isOverDailyCap.mockReset().mockResolvedValue(false);
  mockFetch.mockReset().mockImplementation(async () => new Response(JSON.stringify({ number: 1 }), { status: 201 }));
  env.GITHUB_TOKEN = "test-token";
  env.GITHUB_FEEDBACK_REPO = "test/repo";
});

// Must set env before importing the route module.
const env = process.env as Record<string, string | undefined>;
beforeAll(() => {
  env.GITHUB_TOKEN = "test-token";
  env.GITHUB_FEEDBACK_REPO = "test/repo";
});

// Mock global fetch so the route never hits GitHub.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after env is set so the module picks up the vars.
const { POST, GET } = await import("../route");

// Use a counter to generate unique IPs and avoid triggering rate limits.
let ipCounter = 0;
function makeRequest(body: Record<string, unknown>): Request {
  ipCounter++;
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`,
    },
    body: JSON.stringify({ submissionId: crypto.randomUUID(), ...body }),
  });
}

afterEach(() => {
  database.sqlite.close();
  vi.clearAllMocks();
});

describe("POST /api/feedback — description validation", () => {
  beforeAll(() => {
    // Successful GitHub response for all tests in this suite.
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ number: 1 }), { status: 201 })
    );
  });

  it("accepts a non-empty description without suggestedCorrection", async () => {
    const res = await POST(makeRequest({ type: "general", description: "Looks great!" }));
    expect(res.status).toBe(200);
  });

  it("rejects empty description with no suggestedCorrection", async () => {
    const res = await POST(
      makeRequest({ type: "data_issue", description: "", context: { lensId: "l1", lensModel: "XF35mmF1.4" } })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("empty_description");
  });

  it("rejects whitespace-only description with no suggestedCorrection", async () => {
    const res = await POST(makeRequest({ type: "general", description: "   " }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("empty_description");
  });

  it("accepts empty description when suggestedCorrection is provided", async () => {
    const res = await POST(
      makeRequest({
        type: "data_issue",
        description: "",
        context: {
          lensId: "l1",
          lensModel: "XF35mmF1.4 R",
          field: "maxAperture",
          suggestedCorrection: "f/1.4",
        },
      })
    );
    expect(res.status).toBe(200);
  });

  it("accepts whitespace-trimmed description when suggestedCorrection is provided", async () => {
    const res = await POST(
      makeRequest({
        type: "data_issue",
        description: "  ",
        context: {
          lensId: "l1",
          lensModel: "XF35mmF1.4 R",
          field: "maxAperture",
          suggestedCorrection: "f/1.4",
        },
      })
    );
    expect(res.status).toBe(200);
  });

  it("rejects whitespace-only suggestedCorrection with empty description", async () => {
    const res = await POST(
      makeRequest({
        type: "data_issue",
        description: "",
        context: {
          lensId: "l1",
          lensModel: "XF35mmF1.4 R",
          field: "maxAperture",
          suggestedCorrection: "   ",
        },
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("empty_description");
  });

  it("rejects description exceeding max length", async () => {
    const res = await POST(
      makeRequest({ type: "general", description: "x".repeat(2001) })
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("description_too_long");
  });
});

describe("POST /api/feedback — lensBrand", () => {
  beforeAll(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ number: 1 }), { status: 201 })
    );
  });

  it("includes brand and model together in the Lens line", async () => {
    await POST(
      makeRequest({
        type: "data_issue",
        description: "Wrong value",
        context: { lensId: "l1", lensBrand: "Sony", lensModel: "FE 35mm F2.8" },
      })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(body.body).toContain("**Lens:** Sony FE 35mm F2.8");
  });

  it("preserves lens context on general feedback without treating it as a missing-lens query", async () => {
    await POST(makeRequest({
      type: "general",
      description: "A question about this lens",
      context: { lensId: "xf35", lensBrand: "Fujifilm", lensModel: "XF35mmF1.4 R" },
    }));
    const issue = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { title: string; body: string };
    expect(issue.body).toContain("**Lens:** Fujifilm XF35mmF1.4 R");
    expect(issue.body).toContain("**Lens ID:** `xf35`");
    expect(issue.title).toBe("[Feedback] A question about this lens");
    expect(issue.body).not.toContain("Search query");
  });

  it("shows only model when lensBrand is absent", async () => {
    await POST(
      makeRequest({
        type: "data_issue",
        description: "Wrong value",
        context: { lensId: "l1", lensModel: "FE 35mm F2.8" },
      })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(body.body).toContain("**Lens:** FE 35mm F2.8");
    expect(body.body).not.toMatch(/\*\*Lens:\*\* \S+ \S+ FE/);
  });
});

describe("POST /api/feedback — replyContact", () => {
  beforeAll(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ number: 1 }), { status: 201 })
    );
  });

  it("includes replyContact in the issue body when provided", async () => {
    await POST(
      makeRequest({ type: "general", description: "Great app!", replyContact: "user@example.com" })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(body.body).toContain("**Reply-to:** user@example.com");
  });

  it.each(["support-@example.com", "support+@example.com", "support!@example.com"])("preserves the reply mailbox %s while neutralizing other fields", async (replyContact) => {
    await POST(makeRequest({
      type: "data_issue",
      description: "Ask @someone",
      replyContact,
      context: { lensBrand: "@brand", lensModel: "@model", lensId: "@id", field: "@field", currentValue: "@old", suggestedCorrection: "@new" },
    }));
    const issue = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string; title: string };
    expect(issue.body).toContain(`**Reply-to:** ${replyContact}`);
    expect(issue.body.replace(`**Reply-to:** ${replyContact}`, "")).not.toMatch(/@[a-z]/i);
    expect(issue.title).not.toMatch(/@[a-z]/i);
  });

  it("neutralizes mentions supplied alongside a reply mailbox", async () => {
    await POST(makeRequest({ type: "general", description: "Details", replyContact: "support-@example.com @someone" }));
    const issue = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(issue.body).not.toContain("@someone");
  });

  it("omits Reply-to line when replyContact is not provided", async () => {
    await POST(makeRequest({ type: "general", description: "Great app!" }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(body.body).not.toContain("Reply-to");
  });
});

describe("POST /api/feedback — assignees", () => {
  beforeAll(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ number: 1 }), { status: 201 })
    );
  });

  it("includes configured feedback assignees in the GitHub issue payload", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.GITHUB_FEEDBACK_ASSIGNEES = "alice, bob";

    await POST(makeRequest({ type: "general", description: "Great app!" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { assignees: string[] };
    expect(body.assignees).toEqual(["alice", "bob"]);

    delete env.GITHUB_FEEDBACK_ASSIGNEES;
  });

  it("omits assignees when no feedback assignee is configured", async () => {
    const env = process.env as Record<string, string | undefined>;
    delete env.GITHUB_FEEDBACK_ASSIGNEES;

    await POST(makeRequest({ type: "general", description: "Great app!" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { assignees?: string[] };
    expect(body.assignees).toBeUndefined();
  });
});

describe("POST /api/feedback — type validation", () => {
  it("rejects an invalid type", async () => {
    const res = await POST(makeRequest({ type: "unknown", description: "Test" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("invalid_type");
  });

  it("rejects missing type", async () => {
    const res = await POST(makeRequest({ description: "Test" }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("invalid_type");
  });
});

const fixedPayload = {
  submissionId: "bfb9aef4-6c77-4900-81a6-fbf873ff8c01",
  type: "general",
  description: "Feedback details",
  replyContact: "user@example.com",
};
function statusRequest(id = fixedPayload.submissionId) {
  return new Request(`http://localhost/api/feedback?submissionId=${id}`);
}

describe("feedback submission idempotency", () => {
  it("replays a success without another issue or daily cap charge", async () => {
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "sent" });
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "sent" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(1);
  });

  it("atomically reserves concurrent submissions before calling GitHub", async () => {
    let finish!: (response: Response) => void;
    let started!: () => void;
    const fetching = new Promise<void>((resolve) => { started = resolve; });
    mockFetch.mockImplementationOnce(() => {
      started();
      return new Promise<Response>((resolve) => { finish = resolve; });
    });
    const first = POST(makeRequest(fixedPayload));
    await fetching;
    const duplicates = await Promise.all(Array.from({ length: 5 }, () => POST(makeRequest(fixedPayload))));
    for (const duplicate of duplicates) {
      expect(await duplicate.json()).toEqual({ status: "pending" });
    }
    finish(new Response(JSON.stringify({ number: 42 }), { status: 201 }));
    expect(await (await first).json()).toEqual({ status: "sent" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(1);
  });

  it("allows an edited payload after a known GitHub 4xx failure", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Invalid issue", { status: 422 }));
    const failed = await POST(makeRequest(fixedPayload));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toMatchObject({ status: "failed" });
    expect(await (await GET(statusRequest())).json()).toEqual({ status: "failed" });
    const retried = await POST(makeRequest({ ...fixedPayload, description: "Edited feedback" }));
    expect(await retried.json()).toEqual({ status: "sent" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(2);
  });

  it("applies today's cap to a failed submission from an earlier day", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Invalid issue", { status: 422 }));
    expect(await (await POST(makeRequest(fixedPayload))).json()).toMatchObject({ status: "failed" });
    database.sqlite.prepare("UPDATE feedback_submissions SET created_at = ?, updated_at = ? WHERE submission_id = ?")
      .run(Date.now() - 86_400_000, Date.now() - 86_400_000, fixedPayload.submissionId);
    mocks.isOverDailyCap.mockResolvedValueOnce(true);
    expect((await POST(makeRequest(fixedPayload))).status).toBe(429);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(2);
    expect(await (await GET(statusRequest())).json()).toEqual({ status: null });
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "sent" });
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(3);
  });

  it("releases a retry claim when the quota service is unavailable", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Invalid issue", { status: 422 }));
    await POST(makeRequest(fixedPayload));
    mocks.isOverDailyCap.mockRejectedValueOnce(new Error("KV unavailable"));
    expect((await POST(makeRequest(fixedPayload))).status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(await (await GET(statusRequest())).json()).toEqual({ status: null });
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "sent" });
  });

  it.each(["network", "timeout", "5xx"])("blocks re-creation after an unknown %s outcome", async (failure) => {
    if (failure === "5xx") {
      mockFetch.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    } else {
      mockFetch.mockRejectedValueOnce(failure === "timeout" ? new DOMException("Timed out", "TimeoutError") : new Error("Lost connection"));
    }
    expect(await (await POST(makeRequest(fixedPayload))).json()).toMatchObject({ status: "uncertain" });
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "uncertain" });
    expect(await (await GET(statusRequest())).json()).toEqual({ status: "uncertain" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each(["pending", "sent", "uncertain"])("rejects payload changes for %s IDs", async (status) => {
    database.sqlite.prepare(`INSERT INTO feedback_submissions (submission_id, payload_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).run(fixedPayload.submissionId, "another-hash", status, 1, 1);
    const response = await POST(makeRequest(fixedPayload));
    expect(response.status).toBe(409);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mocks.isOverDailyCap).not.toHaveBeenCalled();
  });

  it("does not recreate an issue when writing sent status fails", async () => {
    database.sqlite.exec(`CREATE TRIGGER fail_completion BEFORE UPDATE ON feedback_submissions WHEN NEW.status = 'sent' BEGIN SELECT RAISE(ABORT, 'write failed'); END;`);
    const first = await POST(makeRequest(fixedPayload));
    expect(await first.json()).toMatchObject({ status: "uncertain" });
    const replay = await POST(makeRequest(fixedPayload));
    expect(await replay.json()).toMatchObject({ status: expect.stringMatching(/^(pending|uncertain)$/) });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a claim non-retryable if every completion write fails", async () => {
    database.sqlite.exec(`CREATE TRIGGER fail_completion BEFORE UPDATE ON feedback_submissions BEGIN SELECT RAISE(ABORT, 'write failed'); END;`);
    expect(await (await POST(makeRequest(fixedPayload))).json()).toMatchObject({ status: "uncertain" });
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "pending" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("uses a finite timeout and disables POST redirects", async () => {
    await POST(makeRequest(fixedPayload));
    const options = mockFetch.mock.calls[0][1] as RequestInit;
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.redirect).toBe("error");
  });

  it("neutralizes unintended mentions in all issue markdown fields", async () => {
    await POST(makeRequest({
      ...fixedPayload,
      type: "data_issue",
      description: "Ask @someone, .@person, +@owner and -@org/team",
      replyContact: "@contact",
      context: { lensBrand: "@brand", lensModel: "@model", lensId: "@id", field: "@field", currentValue: "@old", suggestedCorrection: "@new" },
    }));
    const issue = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string; title: string };
    expect(issue.body).not.toMatch(/@[a-z]/i);
    expect(issue.title).not.toMatch(/@[a-z]/i);
  });
});

describe("feedback readiness and status", () => {
  it("preserves the no-argument readiness response", async () => {
    expect(await (await GET()).json()).toEqual({ ok: true, ready: true, missingEnv: [] });
    expect(mocks.isRateLimited).not.toHaveBeenCalled();
  });

  it("returns only status for known and unknown IDs, never private data", async () => {
    expect(await (await GET(statusRequest())).json()).toEqual({ status: null });
    await POST(makeRequest(fixedPayload));
    expect(await (await GET(statusRequest())).json()).toEqual({ status: "sent" });
    expect(mocks.isRateLimited).toHaveBeenCalledWith(expect.any(Request), "feedbackStatus");
    expect(mocks.isRateLimited).toHaveBeenCalledWith(expect.any(Request), "feedback");
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(1);
  });

  it("validates UUID status lookup and rate limits it using the status policy", async () => {
    expect((await GET(statusRequest("not-a-uuid"))).status).toBe(400);
    mocks.isRateLimited.mockResolvedValueOnce(true);
    expect((await GET(statusRequest())).status).toBe(429);
    expect(mocks.isRateLimited).toHaveBeenLastCalledWith(expect.any(Request), "feedbackStatus");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not leave a pending claim when daily cap denies creation", async () => {
    mocks.isOverDailyCap.mockResolvedValueOnce(true);
    expect((await POST(makeRequest(fixedPayload))).status).toBe(429);
    expect(await (await GET(statusRequest())).json()).toEqual({ status: null });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(await (await POST(makeRequest(fixedPayload))).json()).toEqual({ status: "sent" });
    expect(mocks.isOverDailyCap).toHaveBeenCalledTimes(2);
  });

  it("releases a new claim when the quota service throws", async () => {
    mocks.isOverDailyCap.mockRejectedValueOnce(new Error("KV unavailable"));
    expect((await POST(makeRequest(fixedPayload))).status).toBe(503);
    expect(await (await GET(statusRequest())).json()).toEqual({ status: null });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not reserve a claim for invalid, rate-limited or misconfigured requests", async () => {
    expect((await POST(makeRequest({ ...fixedPayload, description: "" }))).status).toBe(400);
    mocks.isRateLimited.mockResolvedValueOnce(true);
    expect((await POST(makeRequest(fixedPayload))).status).toBe(429);
    delete env.GITHUB_TOKEN;
    expect((await POST(makeRequest(fixedPayload))).status).toBe(500);
    expect(await (await GET(statusRequest())).json()).toEqual({ status: null });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mocks.isOverDailyCap).not.toHaveBeenCalled();
  });
});
