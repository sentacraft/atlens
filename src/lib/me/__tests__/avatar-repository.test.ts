import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createSqliteD1 } from "../../__tests__/support/sqlite-d1";
import { getUserAvatar, removeUserAvatar, setUserAvatar } from "../avatar-repository";

let db: D1Database;
let sqlite: DatabaseSync;

const GOOGLE = "https://lh3.googleusercontent.com/a/bart";
const photo = (byte: number) => new Uint8Array([0xff, 0xd8, 0xff, byte]);
const userImage = () => (sqlite.prepare("SELECT image FROM user WHERE id = 'u1'").get() as { image: string | null }).image;

beforeEach(() => {
  ({ d1: db, sqlite } = createSqliteD1("migrations/app"));
  sqlite.prepare("INSERT INTO user (id, name, email, image, createdAt, updatedAt) VALUES ('u1', 'Bart', 'b@x', ?, 0, 0)").run(GOOGLE);
});

describe("avatar repository", () => {
  it("stores the photo and points the user's image at it", async () => {
    await setUserAvatar(db, { userId: "u1", image: photo(1), contentType: "image/jpeg", now: 10 });

    const avatar = await getUserAvatar(db, "u1");
    expect(avatar?.contentType).toBe("image/jpeg");
    expect([...avatar!.image]).toEqual([...photo(1)]);
    expect(userImage()).toBe("/api/me/avatar?v=10");
  });

  it("replaces the photo on a second upload and keeps the provider picture to restore", async () => {
    await setUserAvatar(db, { userId: "u1", image: photo(1), contentType: "image/jpeg", now: 10 });
    await setUserAvatar(db, { userId: "u1", image: photo(2), contentType: "image/jpeg", now: 20 });

    expect([...(await getUserAvatar(db, "u1"))!.image]).toEqual([...photo(2)]);
    expect(userImage()).toBe("/api/me/avatar?v=20");

    await removeUserAvatar(db, "u1", 30);
    expect(userImage()).toBe(GOOGLE);
    expect(await getUserAvatar(db, "u1")).toBeNull();
  });

  it("leaves no picture after removal when the user had none before", async () => {
    sqlite.prepare("UPDATE user SET image = NULL WHERE id = 'u1'").run();
    await setUserAvatar(db, { userId: "u1", image: photo(1), contentType: "image/png", now: 10 });

    await removeUserAvatar(db, "u1", 20);

    expect(userImage()).toBeNull();
  });

  it("does not touch the user's image when there is no photo to remove", async () => {
    await removeUserAvatar(db, "u1", 20);

    expect(userImage()).toBe(GOOGLE);
  });

  it("goes with the account when the user is deleted", async () => {
    await setUserAvatar(db, { userId: "u1", image: photo(1), contentType: "image/jpeg", now: 10 });

    sqlite.prepare("DELETE FROM user WHERE id = 'u1'").run();

    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM user_avatars").get()).toEqual({ n: 0 });
  });
});
