import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { simulateReadableStream, type UIMessage } from "ai";
import { lensRef } from "@/lib/ai/lens-ref";

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

describe("POST /api/chat gear approval", () => {
  const user: UIMessage = { id: "gear-user", role: "user", parts: [{ type: "text", text: "Which lenses do I own?" }] };
  const pending: UIMessage = { id: "gear-assistant", role: "assistant", parts: [{ type: "tool-myGear", toolCallId: "gear-call", state: "approval-requested", input: {}, approval: { id: "gear-approval" } }] };
  const profile = [{ id: "gear-1", kind: "lens", catalogId: "fujifilm-xf-27mmf28-r-wr-x", name: "XF 27mm F2.8 R WR", brand: "fujifilm", mount: "X", createdAt: 1 }];
  function account() {
    mocks.getSession.mockResolvedValue({ user: { id: "account-1", isAnonymous: false } });
    mocks.listUserGear.mockResolvedValue(profile);
  }
  function model(reads = 0) {
    const steps = Array.from({ length: reads }, (_, i) => modelStep([
      { type: "tool-call", toolCallId: `read-gear-${i}`, toolName: "myGear", input: "{}" },
    ], "tool-calls"));
    const result = new MockLanguageModelV4({ doStream: [...steps, textReply()] });
    mocks.getAgentModel.mockReturnValue(result);
    return result;
  }
  function answer(approved: boolean): UIMessage {
    return { ...pending, parts: [{ type: "tool-myGear", toolCallId: "gear-call", state: "approval-responded", input: {}, approval: { id: "gear-approval", approved } }] };
  }
  const systemNotes = (reply: MockLanguageModelV4, step = 0) => JSON.stringify(reply.doStreamCalls[step].prompt.filter((message) => message.role === "system"));

  it("does not query or inject account gear into an unrelated turn", async () => {
    account();
    const reply = model();
    await settle(await POST(chatRequest()));
    expect(mocks.listUserGear).not.toHaveBeenCalled();
    expect(systemNotes(reply)).toContain("用户已登录");
    expect(systemNotes(reply)).not.toContain("XF 27mm");
    expect(systemNotes(reply)).not.toContain(lensRef(profile[0].catalogId));
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("askToSignIn");
  });

  it("pauses a guest's myGear read on the shared approval", async () => {
    model(1);
    const response = await POST(chatRequest(user));
    expect(response.status).toBe(200);
    const text = await response.text();
    await Promise.all(mocks.waitUntil.mock.calls.map(([promise]) => promise));
    expect(text).toContain("tool-approval-request");
    expect(text).toContain("myGear");
    expect(text).not.toContain("tool-askForGear");
    expect(mocks.listUserGear).not.toHaveBeenCalled();
  });

  it("reads an account profile only through myGear and reuses a per-request snapshot", async () => {
    account();
    const reply = model(2);
    await settle(await POST(chatRequest(user)));
    expect(mocks.listUserGear).toHaveBeenCalledExactlyOnceWith(expect.anything(), "account-1");
    expect(systemNotes(reply)).not.toContain("XF 27mm");
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).not.toContain("XF 27mm");
    expect(JSON.stringify(reply.doStreamCalls[1].prompt)).toContain("XF 27mm");
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).toContain("askForGear");
  });

  it("resumes an original stored gear approval after real account sign-in", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, pending]);
    account();
    const reply = model();
    const response = await POST(chatRequest(answer(true), user.id));
    expect(response.status).toBe(200);
    await settle(response);
    expect(mocks.listUserGear).toHaveBeenCalledExactlyOnceWith(expect.anything(), "account-1");
    expect(systemNotes(reply)).not.toContain("XF 27mm");
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("XF 27mm");
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("Which lenses do I own?");
  });

  it("does not let client approval replace a real account session", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, pending]);
    const reply = model();
    await settle(await POST(chatRequest(answer(true), user.id)));
    expect(mocks.listUserGear).not.toHaveBeenCalled();
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("not signed in");
  });

  it("does not offer another login or editor after cancellation", async () => {
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, pending]);
    const reply = model();
    await settle(await POST(chatRequest(answer(false), user.id)));
    const names = reply.doStreamCalls[0].tools?.map((tool) => tool.name);
    expect(names).not.toContain("myGear");
    expect(names).not.toContain("myFavorites");
    expect(names).not.toContain("askForGear");
    expect(systemNotes(reply)).toContain("用户已取消登录");
    expect(mocks.listUserGear).not.toHaveBeenCalled();
  });

  it("returns an empty profile as a tool result, not an automatic editor", async () => {
    account();
    mocks.listUserGear.mockResolvedValue([]);
    const reply = model(1);
    await settle(await POST(chatRequest(user)));
    expect(JSON.stringify(reply.doStreamCalls[1].prompt)).toContain('"bodies":[]');
    expect(JSON.stringify(reply.doStreamCalls[1].prompt)).toContain('"lenses":[]');
    expect(systemNotes(reply)).not.toContain("档案是空的");
    const saved = mocks.appendAskIrisTurn.mock.calls.at(-1)?.[1].responseMessage;
    expect(saved.parts.some((part: { type: string }) => part.type === "tool-askForGear")).toBe(false);
  });

  it("keeps the editor available for an explicit edit after a previous skip", async () => {
    account();
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [{ type: "tool-askForGear", toolCallId: "old-edit", state: "output-available", input: {}, output: { outcome: "skipped" } }] }]);
    const reply = model();
    await settle(await POST(chatRequest({ id: "edit-question", role: "user", parts: [{ type: "text", text: "Add my new lens" }] }, pending.id)));
    expect(reply.doStreamCalls[0].tools?.map((tool) => tool.name)).toContain("askForGear");
    expect(mocks.listUserGear).not.toHaveBeenCalled();
  });

  it("refreshes through myGear after saving instead of injecting client-supplied names", async () => {
    const part = { type: "tool-askForGear", toolCallId: "edit-gear", input: {}, state: "input-available" } as const;
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [part] }]);
    account();
    const reply = model(1);
    await settle(await POST(chatRequest({ ...pending, parts: [{ ...part, state: "output-available", output: { outcome: "saved", saved: ["Untrusted client gear"] } }] }, user.id)));
    expect(systemNotes(reply)).not.toContain("XF 27mm");
    expect(systemNotes(reply)).not.toContain("Untrusted client gear");
    expect(JSON.stringify(reply.doStreamCalls[1].prompt)).toContain("XF 27mm");
    expect(mocks.listUserGear).toHaveBeenCalledTimes(1);
  });

  it("reads current gear on a new question despite an older completed result", async () => {
    const complete = { type: "tool-myGear", toolCallId: "old-gear", state: "output-available", input: {}, output: { bodies: [], lenses: [{ name: "Historic lens" }] } } as const;
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [complete] }]);
    account();
    const reply = model(1);
    await settle(await POST(chatRequest(undefined, pending.id)));
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("Historic lens");
    expect(JSON.stringify(reply.doStreamCalls[1].prompt)).toContain("XF 27mm");
    expect(mocks.listUserGear).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, null, {}, { id: "old-approval", approved: "yes" }])("returns 400 for malformed stored-tool approval input: %j", async (approval) => {
    const part = { type: "tool-myGear", toolCallId: "gear-call", state: "approval-responded", input: {}, approval };
    const response = await POST(chatRequest({ ...pending, parts: [part] } as unknown as UIMessage, user.id));
    expect(response.status).toBe(400);
    expect(mocks.listUserGear).not.toHaveBeenCalled();
  });

  it("keeps the favorites approval path working after account sign-in", async () => {
    const part = { type: "tool-myFavorites", toolCallId: "favorite-call", state: "approval-requested", input: {}, approval: { id: "favorite-approval" } } as const;
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, { ...pending, parts: [part] }]);
    account();
    mocks.listUserFavorites.mockResolvedValue([{ lensId: profile[0].catalogId }]);
    const reply = model();
    await settle(await POST(chatRequest({ ...pending, parts: [{ ...part, state: "approval-responded", approval: { id: "favorite-approval", approved: true } }] }, user.id)));
    expect(mocks.listUserFavorites).toHaveBeenCalledExactlyOnceWith(expect.anything(), "account-1");
    expect(JSON.stringify(reply.doStreamCalls[0].prompt)).toContain("myFavorites");
    expect(mocks.listUserGear).not.toHaveBeenCalled();
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

describe("POST /api/chat askChoices guards", () => {
  it("omits askChoices after it was already shown in the current user turn", async () => {
    const user: UIMessage = { id: "u-choice", role: "user", parts: [{ type: "text", text: "Zoom lenses" }] };
    const card = {
      type: "tool-askChoices",
      toolCallId: "choice-call",
      state: "input-available",
      input: { questions: [{ question: "Primary use?", options: ["Travel", "Portraits"] }] },
    } as const;
    const paused: UIMessage = { id: "a-choice", role: "assistant", parts: [card] };
    mocks.loadAskIrisTurnHistory.mockResolvedValue([user, paused]);
    const model = new MockLanguageModelV4({ doStream: textReply() });
    mocks.getAgentModel.mockReturnValue(model);

    const resumed: UIMessage = {
      ...paused,
      parts: [{ ...card, state: "output-available", output: { outcome: "answered", answers: [{ question: "Primary use?", picked: ["Travel"] }] } }],
    };
    const response = await POST(chatRequest(resumed, user.id));
    expect(response.status).toBe(200);
    await settle(response);

    expect(model.doStreamCalls[0].tools?.map((tool) => tool.name)).not.toContain("askChoices");
  });

  it("drops askChoices from activeTools once stepNumber reaches 2", async () => {
    const step = (callId: string) =>
      modelStep([{ type: "tool-call", toolCallId: callId, toolName: "readSpecGuide", input: "{}" }], "tool-calls");
    const model = new MockLanguageModelV4({ doStream: [step("s0"), step("s1"), step("s2"), textReply()] });
    mocks.getAgentModel.mockReturnValue(model);

    const response = await POST(chatRequest());
    expect(response.status).toBe(200);
    await settle(response);

    expect(model.doStreamCalls[0].tools?.map((tool) => tool.name)).toContain("askChoices");
    expect(model.doStreamCalls[1].tools?.map((tool) => tool.name)).toContain("askChoices");
    expect(model.doStreamCalls[2].tools?.map((tool) => tool.name)).not.toContain("askChoices");
  });
});
