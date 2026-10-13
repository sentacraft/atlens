import { describe, expect, it } from "vitest";
import { anonymizeId } from "../anonymize";

describe("anonymizeId", () => {
  it("maps the same id to the same value, and different ids apart", async () => {
    const a = await anonymizeId("conversation-1", "secret");

    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(await anonymizeId("conversation-1", "secret")).toBe(a);
    expect(await anonymizeId("conversation-2", "secret")).not.toBe(a);
  });

  it("depends on the secret, so the raw id cannot be recomputed without it", async () => {
    expect(await anonymizeId("conversation-1", "other")).not.toBe(
      await anonymizeId("conversation-1", "secret"),
    );
  });

  it("writes nothing when the secret or the id is missing", async () => {
    expect(await anonymizeId("conversation-1", undefined)).toBe("");
    expect(await anonymizeId("", "secret")).toBe("");
  });
});
