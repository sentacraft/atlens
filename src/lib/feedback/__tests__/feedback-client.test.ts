import { afterEach, describe, expect, it, vi } from "vitest";
import { submitFeedback } from "../feedback-client";

const payload = { submissionId: "62d0483c-8548-412d-a725-af56ec778763", type: "general" as const, description: "A suggestion." };
afterEach(() => { vi.unstubAllGlobals(); });

describe("feedback response status", () => {
  it("preserves an uncertain outcome even when the transport response is 502", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: "uncertain", error: "submission_uncertain" }, { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await submitFeedback(payload)).toEqual({ status: "uncertain" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not treat a pending response as submitted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "pending" }, { status: 202 })));
    expect(await submitFeedback(payload)).toEqual({ status: "pending" });
  });
});
