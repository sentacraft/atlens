import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAskIrisUserId: vi.fn(),
  getAskIrisConversationMessages: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: { APP_DB: {} } }),
}));
vi.mock("@/lib/askiris/conversation-auth", () => ({
  getAskIrisUserId: mocks.getAskIrisUserId,
}));
vi.mock("@/lib/askiris/conversation-repository", () => ({
  getAskIrisConversationMessages: mocks.getAskIrisConversationMessages,
}));

const { GET } = await import("../[conversationId]/route");

function get(conversationId: string) {
  return GET(new Request(`http://localhost/api/askiris/conversations/${conversationId}`), {
    params: Promise.resolve({ conversationId }),
  });
}

beforeEach(() => {
  mocks.getAskIrisUserId.mockResolvedValue("user-1");
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
    mocks.getAskIrisUserId.mockResolvedValue(undefined);

    const response = await get("conversation-1");

    expect(response.status).toBe(401);
    expect(mocks.getAskIrisConversationMessages).not.toHaveBeenCalled();
  });
});
