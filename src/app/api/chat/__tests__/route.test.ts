import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { simulateReadableStream } from "ai";

const mocks = vi.hoisted(() => ({
  getAgentModel: vi.fn(),
  writeAskIrisTrace: vi.fn(),
  appendAskIrisTurn: vi.fn(),
  waitUntil: vi.fn(),
  kv: new Map<string, string>(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({
    env: {
      APP_DB: {},
      ASKIRIS_DB: {},
      RATE_KV: {
        get: async (key: string) => mocks.kv.get(key) ?? null,
        put: async (key: string, value: string) => {
          mocks.kv.set(key, value);
        },
      },
    },
    ctx: { waitUntil: mocks.waitUntil },
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => Object.assign((key: string) => key, { has: () => false }),
}));
vi.mock("@/lib/ai/model", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/model")>()),
  missingAgentModelKey: () => undefined,
  agentCallSettings: () => ({ model: mocks.getAgentModel(), temperature: 0, providerOptions: {} }),
}));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: () => null,
  isBypassed: () => false,
  isRateLimited: async () => false,
}));
vi.mock("@/lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => ({ user: { id: "user-1", isAnonymous: true } }) },
  }),
}));
vi.mock("@/lib/askiris/conversation-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/askiris/conversation-repository")>()),
  loadAskIrisTurnHistory: async () => [],
  appendAskIrisTurn: mocks.appendAskIrisTurn,
}));
vi.mock("@/lib/askiris/trace-repository", () => ({
  workerReleaseId: () => "release-1",
  writeAskIrisTrace: mocks.writeAskIrisTrace,
}));

const { POST } = await import("../route");
const { IRIS_QUOTA } = await import("@/lib/ai/iris-quota");

type LanguageModelV4StreamPart =
  Awaited<ReturnType<MockLanguageModelV4["doStream"]>>["stream"] extends ReadableStream<infer Part> ? Part : never;

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function modelStep(parts: LanguageModelV4StreamPart[], finishReason: "tool-calls" | "stop") {
  return {
    stream: simulateReadableStream<LanguageModelV4StreamPart>({
      chunks: [
        { type: "stream-start", warnings: [] },
        ...parts,
        { type: "finish", finishReason: { unified: finishReason, raw: finishReason }, usage },
      ],
    }),
  };
}

function chatRequest() {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { id: "user-message-1", role: "user", parts: [{ type: "text", text: "Hi" }] },
      previousMessageId: null,
      mount: "X",
      locale: "en",
      id: crypto.randomUUID(),
    }),
  });
}

async function settle(response: Response) {
  await response.text();
  await Promise.all(mocks.waitUntil.mock.calls.map(([promise]) => promise));
}

beforeEach(() => {
  mocks.writeAskIrisTrace.mockResolvedValue(undefined);
  mocks.appendAskIrisTurn.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  mocks.kv.clear();
});

function textReply() {
  return modelStep(
    [
      { type: "text-start", id: "text-1" },
      { type: "text-delta", id: "text-1", delta: "Hello." },
      { type: "text-end", id: "text-1" },
    ],
    "stop",
  );
}

describe("POST /api/chat quota", () => {
  it("answers a guest's daily turns, then refuses and says when the quota resets", async () => {
    const turns = IRIS_QUOTA.guestTurnsDaily;
    mocks.getAgentModel.mockReturnValue(
      new MockLanguageModelV4({ doStream: Array.from({ length: turns }, textReply) }),
    );
    for (let i = 0; i < turns; i++) {
      const response = await POST(chatRequest());
      expect(response.status).toBe(200);
      await settle(response);
    }

    const refused = await POST(chatRequest());

    expect(refused.status).toBe(429);
    const body = (await refused.json()) as { kind: string; resetAt: number };
    expect(body).toMatchObject({ kind: "guest_quota" });
    expect(body.resetAt).toBe((Math.floor(Date.now() / 86_400_000) + 1) * 86_400_000);
  });
});

describe("POST /api/chat trace status", () => {
  it("traces a turn whose tool call failed and the model then answered as completed", async () => {
    mocks.getAgentModel.mockReturnValue(
      new MockLanguageModelV4({
        doStream: [
          modelStep(
            [
              {
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "recommendLenses",
                input: JSON.stringify({ picks: [{ ref: "zzzzz", reason: "Sharp." }] }),
              },
            ],
            "tool-calls",
          ),
          modelStep(
            [
              { type: "text-start", id: "text-1" },
              { type: "text-delta", id: "text-1", delta: "Here you go." },
              { type: "text-end", id: "text-1" },
            ],
            "stop",
          ),
        ],
      }),
    );

    await settle(await POST(chatRequest()));

    expect(mocks.writeAskIrisTrace).toHaveBeenCalledOnce();
    const [, trace] = mocks.writeAskIrisTrace.mock.calls[0];
    expect(trace.responseMessage.parts).toContainEqual(
      expect.objectContaining({ type: "tool-recommendLenses", state: "output-error" }),
    );
    expect(trace).toMatchObject({ status: "completed", errorCode: undefined, finishReason: "stop" });
  });

  it("traces a provider error as a failed turn", async () => {
    mocks.getAgentModel.mockReturnValue(
      new MockLanguageModelV4({
        doStream: {
          stream: simulateReadableStream<LanguageModelV4StreamPart>({
            chunks: [
              { type: "stream-start", warnings: [] },
              { type: "error", error: new Error("upstream 500") },
            ],
          }),
        },
      }),
    );

    await settle(await POST(chatRequest()));

    expect(mocks.writeAskIrisTrace).toHaveBeenCalledOnce();
    expect(mocks.writeAskIrisTrace.mock.calls[0][1]).toMatchObject({
      status: "error",
      errorCode: "stream_failed",
    });
  });
});
