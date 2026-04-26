import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

// Must set env before importing the route module.
beforeAll(() => {
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_FEEDBACK_REPO = "test/repo";
});

// Mock global fetch so the route never hits GitHub.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after env is set so the module picks up the vars.
const { POST } = await import("../route");

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
    body: JSON.stringify(body),
  });
}

afterEach(() => {
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

describe("POST /api/feedback — replyEmail", () => {
  beforeAll(() => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ number: 1 }), { status: 201 })
    );
  });

  it("includes replyEmail in the issue body when provided", async () => {
    await POST(
      makeRequest({ type: "general", description: "Great app!", replyEmail: "user@example.com" })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(body.body).toContain("**Reply-to:** user@example.com");
  });

  it("omits Reply-to line when replyEmail is not provided", async () => {
    await POST(makeRequest({ type: "general", description: "Great app!" }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { body: string };
    expect(body.body).not.toContain("Reply-to");
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
