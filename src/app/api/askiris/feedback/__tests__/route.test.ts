import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  deleteAskIrisResponseFeedback: vi.fn(),
  saveAskIrisResponseFeedback: vi.fn(),
  getSessionUserId: vi.fn(),
  getOwnedAskIrisResponseTurnId: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.getCloudflareContext,
}));
vi.mock("@/lib/askiris/response-feedback-repository", () => ({
  deleteAskIrisResponseFeedback: mocks.deleteAskIrisResponseFeedback,
  saveAskIrisResponseFeedback: mocks.saveAskIrisResponseFeedback,
}));

vi.mock("@/lib/auth-session", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));
vi.mock("@/lib/askiris/conversation-repository", () => ({
  getOwnedAskIrisResponseTurnId: mocks.getOwnedAskIrisResponseTurnId,
}));

const { POST } = await import("../route");
const { DELETE } = await import("../[responseMessageId]/route");

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
  responseMessageId: "assistant-message-1",
  rating: "unhelpful",
  reasonCodes: ["incorrect_information", "missed_requirement"],
  comment: "The answer used the wrong mount.",
};

beforeEach(() => {
  mocks.getCloudflareContext.mockReturnValue({ env: { ASKIRIS_DB: {}, APP_DB: {} } });
  mocks.getSessionUserId.mockResolvedValue("owner");
  mocks.getOwnedAskIrisResponseTurnId.mockResolvedValue("user-message-1");
  mocks.deleteAskIrisResponseFeedback.mockResolvedValue(undefined);
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

  it("takes the turn from the stored response, not the request", async () => {
    await POST(makeRequest({ ...validPayload, turnId: "forged-turn" }));

    expect(mocks.getOwnedAskIrisResponseTurnId).toHaveBeenCalledWith(
      {},
      { responseMessageId: "assistant-message-1", userId: "owner" },
    );
    expect(mocks.saveAskIrisResponseFeedback.mock.calls[0][1].turnId).toBe("user-message-1");
  });

  it("rejects a visitor without a session", async () => {
    mocks.getSessionUserId.mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(401);
    expect(mocks.saveAskIrisResponseFeedback).not.toHaveBeenCalled();
  });

  it("does not rate a response the user does not own", async () => {
    mocks.getOwnedAskIrisResponseTurnId.mockResolvedValueOnce(null);

    const response = await POST(makeRequest(validPayload));

    expect(response.status).toBe(404);
    expect(mocks.saveAskIrisResponseFeedback).not.toHaveBeenCalled();
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

describe("DELETE /api/askiris/feedback/:responseMessageId", () => {
  it("deletes the active response feedback", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/askiris/feedback/assistant-message-1", {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.3.0.1" },
      }),
      { params: Promise.resolve({ responseMessageId: "assistant-message-1" }) },
    );

    expect(response.status).toBe(204);
    expect(mocks.deleteAskIrisResponseFeedback).toHaveBeenCalledWith(
      {},
      "assistant-message-1",
    );
  });

  it("rejects a visitor without a session", async () => {
    mocks.getSessionUserId.mockResolvedValueOnce(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/askiris/feedback/assistant-message-1", {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.3.0.4" },
      }),
      { params: Promise.resolve({ responseMessageId: "assistant-message-1" }) },
    );

    expect(response.status).toBe(401);
    expect(mocks.deleteAskIrisResponseFeedback).not.toHaveBeenCalled();
  });

  it("does not delete feedback on a response the user does not own", async () => {
    mocks.getOwnedAskIrisResponseTurnId.mockResolvedValueOnce(null);

    const response = await DELETE(
      new Request("http://localhost/api/askiris/feedback/assistant-message-1", {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.3.0.5" },
      }),
      { params: Promise.resolve({ responseMessageId: "assistant-message-1" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.deleteAskIrisResponseFeedback).not.toHaveBeenCalled();
  });

  it("rejects an empty response message id", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/askiris/feedback/", {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.3.0.2" },
      }),
      { params: Promise.resolve({ responseMessageId: "" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.deleteAskIrisResponseFeedback).not.toHaveBeenCalled();
  });

  it("returns a service error when deletion fails", async () => {
    mocks.deleteAskIrisResponseFeedback.mockRejectedValueOnce(new Error("D1 unavailable"));

    const response = await DELETE(
      new Request("http://localhost/api/askiris/feedback/assistant-message-2", {
        method: "DELETE",
        headers: { "x-forwarded-for": "10.3.0.3" },
      }),
      { params: Promise.resolve({ responseMessageId: "assistant-message-2" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "feedback_unavailable" });
  });
});
