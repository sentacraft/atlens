import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSqliteD1 } from "../../__tests__/support/sqlite-d1";
import { listAskIrisConversations } from "../conversation-repository";
import { linkAnonymousUser } from "../link-anonymous-user";

let db: D1Database;
let sqlite: ReturnType<typeof createSqliteD1>["sqlite"];

beforeEach(() => {
  ({ d1: db, sqlite } = createSqliteD1("migrations/app"));
  for (const [id, anonymous] of [["anon", 1], ["account", 0]] as const) {
    sqlite
      .prepare(
        "INSERT INTO user (id, name, email, isAnonymous, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, 0)",
      )
      .run(id, id, `${id}@example.test`, anonymous);
  }
  sqlite
    .prepare(
      "INSERT INTO askiris_conversations (id, user_id, title, created_at, updated_at) VALUES ('c1', 'anon', 'Portrait lens', 1, 1)",
    )
    .run();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const ids = async (userId: string) =>
  (await listAskIrisConversations(db, userId)).map((conversation) => conversation.id);

describe("linkAnonymousUser", () => {
  it("moves the anonymous conversations to the account, then deletes the anonymous user", async () => {
    const deleteUser = vi.fn(async () => {});

    await linkAnonymousUser(db, {
      anonymousUserId: "anon",
      newUserId: "account",
      newUserIsAnonymous: false,
      deleteUser,
    });

    expect(await ids("account")).toEqual(["c1"]);
    expect(await ids("anon")).toEqual([]);
    expect(deleteUser).toHaveBeenCalledWith("anon");
  });

  it("keeps the anonymous user when the move fails, so its conversations survive", async () => {
    const deleteUser = vi.fn(async () => {});

    await linkAnonymousUser(db, {
      anonymousUserId: "anon",
      newUserId: "missing-user",
      newUserIsAnonymous: false,
      deleteUser,
    });

    expect(deleteUser).not.toHaveBeenCalled();
    expect(await ids("anon")).toEqual(["c1"]);
  });

  it("does not fail the sign-in when deleting the anonymous user fails", async () => {
    await expect(
      linkAnonymousUser(db, {
        anonymousUserId: "anon",
        newUserId: "account",
        newUserIsAnonymous: false,
        deleteUser: async () => {
          throw new Error("delete failed");
        },
      }),
    ).resolves.toBeUndefined();
    expect(await ids("account")).toEqual(["c1"]);
  });

  it.each([
    ["the new session is anonymous", "account", true],
    ["the session belongs to the same user", "anon", false],
  ])("leaves everything in place when %s", async (_, newUserId, newUserIsAnonymous) => {
    const deleteUser = vi.fn(async () => {});

    await linkAnonymousUser(db, { anonymousUserId: "anon", newUserId, newUserIsAnonymous, deleteUser });

    expect(deleteUser).not.toHaveBeenCalled();
    expect(await ids("anon")).toEqual(["c1"]);
  });
});
