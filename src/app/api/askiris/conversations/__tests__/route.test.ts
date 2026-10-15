import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  getAskIrisConversationMessages: vi.fn(),
  renameAskIrisConversation: vi.fn(),
  deleteAskIrisConversation: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { APP_DB: {} } }),
}));
vi.mock("@/lib/auth-session", () => ({
  getSessionUserId: mocks.getSessionUserId,
}));
vi.mock("@/lib/askiris/conversation-repository", () => ({
  getAskIrisConversationMessages: mocks.getAskIrisConversationMessages,
  renameAskIrisConversation: mocks.renameAskIrisConversation,
  deleteAskIrisConversation: mocks.deleteAskIrisConversation,
}));

const { DELETE, GET, PATCH } = await import("../[conversationId]/route");

function get(conversationId: string) {
  return GET(new Request(`http://localhost/api/askiris/conversations/${conversationId}`), {
    params: Promise.resolve({ conversationId }),
  });
}

beforeEach(() => {
  mocks.getSessionUserId.mockResolvedValue("user-1");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/askiris/conversations/[conversationId]", () => {
  it("returns the messages of an owned conversation", async () => {
    mocks.getAskIrisConversationMessages.mockResolvedValue([{ id: "m1" }]);

    const response = await get("conversation-1");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      conversationId: "conversation-1",
      messages: [{ id: "m1" }],
    });
  });

  it("returns 404 for a conversation that is missing or owned by someone else", async () => {
    mocks.getAskIrisConversationMessages.mockResolvedValue([]);

    const response = await get("conversation-2");

    expect(response.status).toBe(404);
  });

  it("returns 401 without a session", async () => {
    mocks.getSessionUserId.mockResolvedValue(undefined);

    const response = await get("conversation-1");

    expect(response.status).toBe(401);
    expect(mocks.getAskIrisConversationMessages).not.toHaveBeenCalled();
  });
});

function patch(conversationId: string, body: unknown) {
  return PATCH(
    new Request(`http://localhost/api/askiris/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ conversationId }) },
  );
}

function remove(conversationId: string) {
  return DELETE(
    new Request(`http://localhost/api/askiris/conversations/${conversationId}`, { method: "DELETE" }),
    { params: Promise.resolve({ conversationId }) },
  );
}

describe("PATCH /api/askiris/conversations/[conversationId]", () => {
  it("saves a trimmed title", async () => {
    mocks.renameAskIrisConversation.mockResolvedValue(true);

    const response = await patch("conversation-1", { title: "  Street lens  " });

    expect(response.status).toBe(204);
    expect(mocks.renameAskIrisConversation).toHaveBeenCalledWith({}, {
      conversationId: "conversation-1",
      userId: "user-1",
      title: "Street lens",
    });
  });

  it("rejects an empty title", async () => {
    const response = await patch("conversation-1", { title: "   " });

    expect(response.status).toBe(400);
    expect(mocks.renameAskIrisConversation).not.toHaveBeenCalled();
  });

  it("returns 404 for a conversation that is missing or owned by someone else", async () => {
    mocks.renameAskIrisConversation.mockResolvedValue(false);

    expect((await patch("conversation-2", { title: "x" })).status).toBe(404);
  });
});

describe("DELETE /api/askiris/conversations/[conversationId]", () => {
  it("deletes an owned conversation", async () => {
    mocks.deleteAskIrisConversation.mockResolvedValue(true);

    expect((await remove("conversation-1")).status).toBe(204);
  });

  it("returns 404 for a conversation that is missing or owned by someone else", async () => {
    mocks.deleteAskIrisConversation.mockResolvedValue(false);

    expect((await remove("conversation-2")).status).toBe(404);
  });

  it("requires a session", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);

    expect((await remove("conversation-1")).status).toBe(401);
  });
});
