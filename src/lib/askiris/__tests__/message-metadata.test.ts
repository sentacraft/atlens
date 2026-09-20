import { describe, expect, it } from "vitest";
import { askIrisMessageMetadataSchema } from "../message-metadata";

describe("askIrisMessageMetadataSchema", () => {
  it("accepts the identifiers attached to an assistant response", () => {
    expect(
      askIrisMessageMetadataSchema.parse({
        turnId: "user-message-id",
        traceId: "trace-id",
      }),
    ).toEqual({
      turnId: "user-message-id",
      traceId: "trace-id",
    });
  });

  it("rejects a response without either identifier", () => {
    expect(askIrisMessageMetadataSchema.safeParse({ turnId: "" }).success).toBe(false);
  });
});
