import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  saveAskIrisResponseFeedback: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
vi.mock("@/lib/askiris/response-feedback-repository", () => ({
  saveAskIrisResponseFeedback: mocks.saveAskIrisResponseFeedback,
}));

const { GET, POST } = await import("../route");

let ipCounter = 0;
function makeRequest(body: unknown): Request {
  ipCounter += 1;
  return new Request("http://localhost/api/askiris/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.1.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`,
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  turnId: "user-message-1",
  responseMessageId: "assistant-message-1",
  rating: "unhelpful",
  reasonCodes: ["incorrect_information", "missed_requirement"],
  comment: "The answer used the wrong mount.",
};

beforeEach(() => {
  mocks.getCloudflareContext.mockReturnValue({ env: { ASKIRIS_DB: {} } });
  mocks.saveAskIrisResponseFeedback.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/askiris/feedback", () => {
  it("persists a valid response feedback record", async () => {
    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.saveAskIrisResponseFeedback).toHaveBeenCalledOnce();
    expect(mocks.saveAskIrisResponseFeedback).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        turnId: "user-message-1",
        responseMessageId: "assistant-message-1",
        rating: "unhelpful",
        reasonCodes: ["incorrect_information", "missed_requirement"],
        comment: "The answer used the wrong mount.",
        feedbackId: expect.any(String),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      }),
    );
  });

  it("deduplicates reason codes before persisting", async () => {
    const response = await POST(
      makeRequest({ ...validPayload, reasonCodes: ["unclear_answer", "unclear_answer"] }),
    );

    expect(response.status).toBe(200);
    expect(mocks.saveAskIrisResponseFeedback.mock.calls[0][1]).toEqual(
      expect.objectContaining({ reasonCodes: ["unclear_answer"] }),
    );
  });

  it("accepts a helpful rating without optional details", async () => {
    const response = await POST(
      makeRequest({
        turnId: "user-message-1",
        responseMessageId: "assistant-message-1",
        rating: "helpful",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.saveAskIrisResponseFeedback.mock.calls[0][1]).toEqual(
      expect.objectContaining({ rating: "helpful", reasonCodes: undefined, comment: undefined }),
    );
  });

  it("rejects malformed JSON and does not write", async () => {
    const response = await POST(
      new Request("http://localhost/api/askiris/feedback", {
        method: "POST",
        headers: { "x-forwarded-for": "10.2.0.1" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_feedback" });
    expect(mocks.saveAskIrisResponseFeedback).not.toHaveBeenCalled();
  });

  it("rejects invalid fields", async () => {
    const response = await POST(
      makeRequest({ ...validPayload, rating: "neutral", comment: "x".repeat(2001) }),
    );

    expect(response.status).toBe(400);
    expect(mocks.saveAskIrisResponseFeedback).not.toHaveBeenCalled();
  });

  it("returns a service error when persistence fails", async () => {
    mocks.saveAskIrisResponseFeedback.mockRejectedValueOnce(new Error("D1 unavailable"));

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "feedback_unavailable" });
  });
});

describe("GET /api/askiris/feedback", () => {
  it("is not supported", () => {
    const response = GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
});
