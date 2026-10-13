import { describe, expect, it } from "vitest";
import { createSqliteD1 } from "./support/sqlite-d1";

describe("APP_DB migrations", () => {
  it("adds the anonymous flag to users, defaulting to a regular account", () => {
    const { sqlite } = createSqliteD1("migrations/app");
    sqlite.exec(
      "INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES ('u1', 'Iris', 'i@example.test', 0, 0)",
    );

    expect(sqlite.prepare("SELECT isAnonymous FROM user WHERE id = 'u1'").get()).toEqual({
      isAnonymous: 0,
    });
  });

  it("creates Better Auth's rate-limit table with one row per key", () => {
    const { sqlite } = createSqliteD1("migrations/app");
    const insert = sqlite.prepare(
      "INSERT INTO rateLimit (id, key, count, lastRequest) VALUES (?, ?, 1, 0)",
    );
    insert.run("r1", "1.2.3.4/sign-in/anonymous");

    expect(() => insert.run("r2", "1.2.3.4/sign-in/anonymous")).toThrow(/UNIQUE/);
  });
});
