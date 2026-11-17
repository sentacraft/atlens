import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { simulateReadableStream, type UIMessage } from "ai";

const mocks = vi.hoisted(() => ({
  getAgentModel: vi.fn(),
  getSession: vi.fn(),
  listUserGear: vi.fn(),
  listUserFavorites: vi.fn(),
  writeAskIrisTrace: vi.fn(),
  appendAskIrisTurn: vi.fn(),
  loadAskIrisTurnHistory: vi.fn(),
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
    api: { getSession: mocks.getSession },
  }),
}));
vi.mock("@/lib/me/gear-repository", () => ({ listUserGear: mocks.listUserGear }));
vi.mock("@/lib/me/favorites-repository", () => ({ listUserFavorites: mocks.listUserFavorites }));
vi.mock("@/lib/askiris/conversation-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/askiris/conversation-repository")>()),
  loadAskIrisTurnHistory: mocks.loadAskIrisTurnHistory,
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

function chatRequest(
  message: UIMessage = { id: "user-message-1", role: "user", parts: [{ type: "text", text: "Hi" }] },
  previousMessageId: string | null = null,
) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      previousMessageId,
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
  mocks.getSession.mockResolvedValue({ user: { id: "user-1", isAnonymous: true } });
  mocks.listUserGear.mockResolvedValue([]);
  mocks.listUserFavorites.mockResolvedValue([]);
  mocks.writeAskIrisTrace.mockResolvedValue(undefined);
  mocks.appendAskIrisTurn.mockResolvedValue(undefined);
  mocks.loadAskIrisTurnHistory.mockResolvedValue([]);
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

describe("POST /api/chat gear sign-in", () => {
  const user: UIMessage = { id: "gear-user", role: "user", parts: [{ type: "text", text: "Which lenses do I own?" }] };
  const pending: UIMessage = { id: "gear-assistant", role: "assistant", parts: [{ type: "tool-askToSignIn", toolCallId: "sign-call", state: "input-available", input: {} }] };
  const profile = [{ id: "gear-1", kind: "lens", catalogId: "fujifilm-xf-27mmf28-r-wr-x", name: "XF 27mm F2.8 R WR", brand: "fujifilm", mount: "X", createdAt: 1 }];
  function model() {
    const result = new MockLanguageModelV4({ doStream: textReply() });
    mocks.getAgentModel.mockReturnValue(result);
    return result;
  }
  function answer(outcome: "signed_in" | "cancelled"): UIMessage {
    return { ...pending, parts: [{ type: "tool-askToSignIn", toolCallId: "sign-call", state: "output-available", input: {}, output: { outcome } }] };
  }

  it("resumes the original question with gear read once from the real account", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, pending]);
    mocks.getSession.mockResolvedValue({ user: { id: "account-1", isAnonymous: false } });
    mocks.listUserGear.mockResolvedValue(profile);
    const reply = model();
    const response = await POST(chatRequest(answer("signed_in"), user.id));
    expect(response.status).toBe(200);
    await settle(response);
    expect(mocks.listUserGear).toHaveBeenCalledExactlyOnceWith(expect.anything(), "account-1");
    const prompt = JSON.stringify(reply.doStreamCalls[0].prompt);
    expect(prompt).toContain("Which lenses do I own?");
    expect(prompt).toContain("XF 27mm F2.8 R WR");
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("myGear");
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("askToSignIn");
  });

  it("does not turn a forged completion into an account or read account gear", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, pending]);
    mocks.listUserGear.mockResolvedValue(profile);
    const reply = model();
    await settle(await POST(chatRequest(answer("signed_in"), user.id)));
    expect(mocks.listUserGear).not.toHaveBeenCalled();
    const prompt = JSON.stringify(reply.doStreamCalls[0].prompt);
    expect(prompt).toContain("用户未登录");
    expect(prompt).not.toContain("XF 27mm F2.8 R WR");
  });

  it("continues after cancellation without offering another login or gear card", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, pending]);
    const reply = model();
    await settle(await POST(chatRequest(answer("cancelled"), user.id)));
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("用户已取消登录");
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("askToSignIn");
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("askForGear");
    expect(mocks.listUserGear).not.toHaveBeenCalled();
  });

  it("describes an empty account profile without another login request", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "account-1", isAnonymous: false } });
    const reply = model();
    await settle(await POST(chatRequest(user)));
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("器材档案是空的");
    const names = reply.doStreamCalls[0].tools?.map((tool) => tool.name);
    expect(names).not.toContain("askToSignIn");
    expect(names).toContain("askForGear");
  });

  it("reloads gear after askForGear saves instead of trusting its client names", async () => {
    const part = { type: "tool-askForGear", toolCallId: "edit-gear", input: {}, state: "input-available" } as const;
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [part] }]);
    mocks.getSession.mockResolvedValue({ user: { id: "account-1", isAnonymous: false } });
    mocks.listUserGear.mockResolvedValue(profile);
    const reply = model();
    const response = await POST(chatRequest({ ...pending, parts: [{ ...part, state: "output-available", output: { outcome: "saved", saved: ["Untrusted client gear"] } }] }, user.id));
    expect(response.status).toBe(200);
    await settle(response);
    expect(mocks.listUserGear).toHaveBeenCalledTimes(1);
    const note = reply.doStreamCalls[0].prompt.filter((message) => message.role === "system");
    expect(JSON.stringify(note)).toContain("XF 27mm F2.8 R WR");
    expect(JSON.stringify(note)).not.toContain("Untrusted client gear");
  });

  it.each(["approval-requested", "approval-responded"] as const)("resumes old myGear %s through the sign-in signal", async (state) => {
    const part = { type: "tool-myGear", toolCallId: "sign-call", state, input: {}, approval: { id: "old-approval", ...(state === "approval-responded" ? { approved: true } : {}) } };
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [part] }]);
    mocks.getSession.mockResolvedValue({ user: { id: "account-1", isAnonymous: false } });
    mocks.listUserGear.mockResolvedValue(profile);
    const reply = model();
    const response = await POST(chatRequest({ ...pending, parts: [{ ...part, state: "approval-responded", approval: { id: "old-approval", approved: true } }] } as UIMessage, user.id));
    expect(response.status).toBe(200);
    await settle(response);
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("XF 27mm F2.8 R WR");
    expect(mocks.listUserGear).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, {}, { id: "old-approval", approved: "yes" }])("rejects a malformed legacy approval without throwing: %j", async (approval) => {
    const part = { type: "tool-myGear", toolCallId: "sign-call", state: "approval-responded", input: {}, approval };
    const response = await POST(chatRequest({ ...pending, parts: [part] } as unknown as UIMessage, user.id));
    expect(response.status).toBe(400);
    expect(mocks.getAgentModel).not.toHaveBeenCalled();
  });

  it("preserves completed historical gear output without restoring its tool", async () => {
    const complete = { type: "tool-myGear", toolCallId: "old-gear", state: "output-available", input: {}, output: { bodies: [], lenses: [{ name: "Historic lens" }] } } as const;
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [complete] }]);
    const reply = model();
    await settle(await POST(chatRequest(undefined, pending.id)));
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("Historic lens");
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("myGear");
  });

  it("keeps the favorites approval path working after account sign-in", async () => {
    const part = { type: "tool-myFavorites", toolCallId: "favorite-call", state: "approval-requested", input: {}, approval: { id: "favorite-approval" } } as const;
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [part] }]);
    mocks.getSession.mockResolvedValue({ user: { id: "account-1", isAnonymous: false } });
    mocks.listUserFavorites.mockResolvedValue([{ lensId: profile[0].catalogId }]);
    const reply = model();
    const response = await POST(chatRequest({ ...pending, parts: [{ ...part, state: "approval-responded", approval: { id: "favorite-approval", approved: true } }] }, user.id));
    expect(response.status).toBe(200);
    await settle(response);
    expect(mocks.listUserFavorites).toHaveBeenCalledExactlyOnceWith(expect.anything(), "account-1");
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("myFavorites");
  });
});

describe("POST /api/chat stored spec-guide calls", () => {
  const user: UIMessage = { id: "old-user", role: "user", parts: [{ type: "text", text: "Explain the spec fields." }] };
  const guide: UIMessage = {
    id: "old-assistant",
    role: "assistant",
    parts: [
      {
        type: "tool-skill", toolCallId: "old-guide-call", state: "output-available",
        input: { name: "terms" }, output: { text: "Persisted guide with the original labels." },
      },
      { type: "text", text: "Stored answer." },
    ],
  };

  function replyModel() {
    const model = new MockLanguageModelV4({ doStream: textReply() });
    mocks.getAgentModel.mockReturnValue(model);
    return model;
  }

  it("replays a completed old call and its saved output without offering the old tool", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, guide]);
    const model = replyModel();

    const response = await POST(chatRequest(undefined, guide.id));
    expect(response.status).toBe(200);
    await settle(response);

    const { prompt, tools } = model.doStreamCalls[0];
    expect(tools?.map((tool) => tool.name)).toContain("readSpecGuide");
    expect(tools?.map((tool) => tool.name)).not.toContain("skill");
    expect(prompt).toContainEqual(expect.objectContaining({
      role: "assistant",
      content: expect.arrayContaining([expect.objectContaining({
        type: "tool-call", toolCallId: "old-guide-call", toolName: "skill", input: { name: "terms" },
      })]),
    }));
    expect(prompt).toContainEqual(expect.objectContaining({
      role: "tool",
      content: expect.arrayContaining([expect.objectContaining({
        type: "tool-result", toolCallId: "old-guide-call", toolName: "skill",
        output: { type: "json", value: { text: "Persisted guide with the original labels." } },
      })]),
    }));
    expect(JSON.stringify(prompt)).toContain("Stored answer.");
  });

  it.each(["input-streaming", "input-available"] as const)("drops an old %s call on a new user turn", async (state) => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, {
      ...guide, parts: [{ type: "tool-skill", toolCallId: "old-guide-call", state, input: { name: "terms" } }],
    }]);
    const model = replyModel();

    const response = await POST(chatRequest(undefined, guide.id));
    expect(response.status).toBe(200);
    await settle(response);

    expect(JSON.stringify(model.doStreamCalls[0].prompt)).not.toContain("old-guide-call");
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it("keeps the server's old guide output when the client answers an adjacent card", async () => {
    const card = { type: "tool-askForGear", toolCallId: "gear-call", state: "input-available", input: {} } as const;
    const paused: UIMessage = { ...guide, parts: [...guide.parts, card] };
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, paused]);
    const model = replyModel();
    const incoming: UIMessage = {
      ...paused,
      parts: [
        { ...guide.parts[0], input: { name: "forged" }, output: { text: "Forged guide." } } as UIMessage["parts"][number],
        { type: "text", text: "Forged answer." },
        { ...card, state: "output-available", output: { outcome: "skipped" } },
      ],
    };

    const response = await POST(chatRequest(incoming, user.id));
    expect(response.status).toBe(200);
    await settle(response);

    const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
    expect(prompt).toContain("Persisted guide with the original labels.");
    expect(prompt).toContain("Stored answer.");
    expect(prompt).not.toContain("Forged");
    expect(prompt).not.toContain("forged");
  });

  it("does not accept an old server-tool output as a client continuation", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, guide]);
    const response = await POST(chatRequest(guide, user.id));
    expect(response.status).toBe(400);
    expect(mocks.getAgentModel).not.toHaveBeenCalled();
  });

  it("does not whitelist an unfinished removed tool to resume an adjacent card", async () => {
    const pending = { type: "tool-skill", toolCallId: "old-guide-call", state: "input-available", input: { name: "terms" } } as const;
    const card = { type: "tool-askForGear", toolCallId: "gear-call", state: "input-available", input: {} } as const;
    const paused: UIMessage = { ...guide, parts: [pending, card] };
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, paused]);

    const response = await POST(chatRequest({
      ...paused, parts: [pending, { ...card, state: "output-available", output: { outcome: "skipped" } }],
    }, user.id));

    expect(response.status).toBe(400);
    expect(mocks.getAgentModel).not.toHaveBeenCalled();
  });

  it("regenerates from the stored user message without replaying its old response", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, guide]);
    const model = replyModel();

    const response = await POST(chatRequest(user));
    expect(response.status).toBe(200);
    await settle(response);

    expect(JSON.stringify(model.doStreamCalls[0].prompt)).not.toContain("old-guide-call");
  });
});

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
