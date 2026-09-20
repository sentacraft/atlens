import { describe, expect, it } from "vitest";
import { toDataPoint } from "../analytics/events";

describe("toDataPoint", () => {
  it("does not put AskIris message content into Analytics Engine", () => {
    expect(
      toDataPoint(
        "askiris_message",
        "sid",
        "zh",
        { query: "private message", method: "typed" },
        false,
      ),
    ).toEqual({
      indexes: ["askiris_message"],
      blobs: ["sid", "zh", "", "", "typed", "", ""],
      doubles: [0],
    });
  });
});
